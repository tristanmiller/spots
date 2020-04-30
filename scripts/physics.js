
const K_W = 2.2e9; // Pa
const RHO_W = 997.0; // kg/m^3
const PR_W = 1.015e5; // Pa
const MU_W = 1.787e-6; //m^2/s
const ETA_W = 8.9e-4; //Pa.s
const RHO_Crit_W = 9.96955363e2; //pre-calculated critical density that produces cavitation pressure for water

const K_A = 1.01e5; // Pa
const RHO_A = 1.225; // kg/m^3
const PR_A = 1.015e5; // Pa
const MU_A = 1.48e-5; //m^2/s
const ETA_A = 1.81e-5; //Pa.s

const TIME_STEP = 0.0001; // seconds
const INTERVALS = Math.round(1/TIME_STEP);
const GRAV_ACCN = 9.8; //ms^-2
const FRIC_CONST = 1; //global friction constant - should be a function of medium and hose material
const RESTRICTION_DIAMETER = 0.064;
const VELOCITY_LIMIT = 1000; //ms^-1 //little hack to stop things getting too crazy
const PIPE_ANGLE = -0.25*Math.PI;
const VELOCITY_THRESHOLD = 1e-8;  //how much precision for velocity?
const ELEMENT_LENGTH = 1; //metres

let g_interfaces = [];
let g_elements = [];

function connectElements (elm1, elm2) {
  //what about the end positions of the elements?
  let iface = new Interface([elm1, elm2]);
}

function frictionFactor (diameter, velocity) {
  return Math.abs(velocity)/Math.pow(diameter,2);
}

const FRIC_REF = frictionFactor(0.15, 1e-5);

function Fluid (pressure_ref, rho_ref, K, mu, eta, pressure_cav) {
  this.PR = pressure_ref;
  this.RHO = rho_ref;
  this.K = K;
  this.MU = mu;
  this.ETA = eta;

  if (pressure_cav) {
    let rho_cav = this.RHO*(1 + (pressure_cav - this.PR)/this.K);
    this.RHO_Critical = rho_cav;
  } else {
    this.RHO_Critical = 0;
  }
}

const water = new Fluid (PR_W, RHO_W, K_W, MU_W, ETA_W, 3e3);
const air = new Fluid (PR_A, RHO_A, K_A, MU_A, ETA_A);

function Element(diameter, length, angle, pos_start){
  this.diameter = diameter;
  this.elm_length = length;
  this.area = this.findArea();
  this.volume = this.findVolume();
  this.angle = angle;
  this.directionSine = Math.sin(this.angle);
  this.directionCosine = Math.cos(this.angle);
  this.pos_start = pos_start;
  this.pos_end = this.findPosEnd();
  this.pos_middle = this.findPosMiddle();
  this.type =  'simple';
  this.interfaces = [];
  this.flows = [];
  g_elements.push(this);
}

Element.prototype.findArea = function () {
  let area = Math.PI*(0.5*Math.pow(this.diameter, 2));
  return area;
};

Element.prototype.findVolume = function () {
  let area = this.findArea();
  let volume = area*this.elm_length;
  return volume;
};

Element.prototype.findPosEnd = function () {
  let endX = this.pos_start.x + this.elm_length*this.directionCosine;
  let endZ = this.pos_start.z + this.elm_length*this.directionSine;
  let pos_end = {x: endX, z: endZ};
  return pos_end;
};

Element.prototype.findPosMiddle = function () {
  let midX = (this.pos_start.x + this.pos_end.x)/2;
  let midZ = (this.pos_start.z + this.pos_end.z)/2;
  let pos_mid = {x: midX, z: midZ};
  return pos_mid;
};

Element.prototype.newDensityFromPressure = function (pr_ref, rho_ref, K) {
  // let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  let rho_new = rho_ref*(1 + (this.pressure - pr_ref)/K);
  this.rho = rho_new;
}

Element.prototype.newPressureFromDensity = function (pr_ref, rho_ref, K) {
  // let pr_new = K*Math.log(rho/rho_ref);
  let pr_new = pr_ref + K*(this.rho - rho_ref)/rho_ref;
  this.pressure = pr_new;
}

Element.prototype.findMass = function () {
  let volume = this.findVolume();
  let mass = this.rho*volume;
  this.mass = mass;
}

Element.prototype.findDensity = function () {
  if (this.mass > 0 && this.volume > 0) {
    this.rho = this.mass/this.volume;
  }
}

//the following is used to update the density, then the pressure of an element
//when the mass and/or volume has changed
Element.prototype.update = function () {
  this.area = this.findArea()
  this.volume = this.findVolume();
  this.findDensity();
  this.newPressureFromDensity(PR_W, RHO_W, K_W);
  this.flows = [];
}

Element.prototype.fill = function (fluid, pressure) {
  this.fluid = fluid;
  if (pressure) {this.pressure = pressure;} else {this.pressure = this.fluid.PR;}
  this.newDensityFromPressure(this.fluid.PR, this.fluid.RHO, this.fluid.K);
  this.findMass();
}

Element.prototype.checkMassFlows = function () {

  //go through list of flows
  //work out if there is a net loss of mass
  //if so, work out whether it results in 'too low' density
  //if so, scale the -ve flows appropriately
  //scale the velocities on the corresponding interfaces appropriately

    let net_massFlow = 0;
    let inflows = [];
    let outflows = [];
    let outflow = 0;
    for (let i = 0, l = this.flows.length; i < l; i++) {
      let flow = this.flows[i];
      net_massFlow += flow[0];
      if (flow[0] < 0) {
        outflows.push(this.flows[i]);
        outflow += flow[0];}
      else {inflows.push(flow);}
    }

    let mass_critical = this.volume*RHO_Crit_W;

    if(this.mass + net_massFlow < mass_critical) {
      //find the outflow that will bring the mass to mass_critical
      let max_outflow = mass_critical - this.mass;
      //find a scaling factor i.e. desired/actual outflow
      let scale_factor = max_outflow/outflow;
      if(scale_factor < 0) {scale_factor = 0;} else if (scale_factor > 1) {scale_factor = 1;}
      // console.log(scale_factor);
      //scale each of the flows in the outflows list. Also scale the velocities of the corresponding interfaces
      for (let i = 0, l = this.flows.length; i < l; i++) {
        if(this.flows[i][0] < 0){
          this.flows[i][0] = this.flows[i][0]*scale_factor;
          this.flows[i][1].velocity = this.flows[i][1].velocity*scale_factor;
          this.flows[i][1].massFlow = this.flows[i][1].massFlow*scale_factor;
        }
      }
      return true;
    } else {return false;}
}

function Sink (diameter, pipe_length, angle, pos_start, pressure, fluid) {
  Element.call(this, diameter, pipe_length, angle, pos_start);
  this.pressure = pressure;
  this.default_pressure = pressure;
  this.fill(fluid, pressure);
  this.type = 'sink';
}

Sink.prototype = Object.create(Element.prototype);

Sink.prototype.update = function () {
  this.fill(this.fluid, this.default_pressure);
  this.flows = [];
}



function Pipe (diameter, pipe_length, angle, pos_start) {
    //basically - create however many elements are needed,
    //stitch them together with interfaces
    let N = pipe_length/ELEMENT_LENGTH; //what happens if N is not an integer?
    // Give priority to the specified length of the pipe - expand/contract the elements as necessary
    N = Math.floor(N);
    let element_length = pipe_length/N;
    this.elements = [];
    this.interfaces = [];

    for (let i = 0; i < N; i++) {
        // create element
        let strt = pos_start;
        if (i > 0) {strt = this.elements[i - 1].pos_end;}
        let elm = new Element(diameter, element_length, angle, strt);
        this.elements.push(elm);
    }

    this.startElement = this.elements[0];
    this.endElement = this.elements[this.elements.length - 1];

    this.pos_start = pos_start;
    this.pos_end = this.endElement.pos_end;

    for (let i = 1; i < N; i++) {
      //create interfaces
        let iface = new Interface([this.elements[i - 1], this.elements[i]]);
        this.interfaces.push(iface);
    }
}

Pipe.prototype.fill = function (fluid, pressure) {
  for (let i = 0, l = this.elements.length; i < l; i++) {
    this.elements[i].fill(fluid, pressure);
  }
}

Pipe.prototype.checkMassFlows = function() {
  for (let i = 0, l = this.elements.length; i < l; i++) {
    if(this.elements[i].checkMassFlows()) {
      this.checkMassFlows();
    }
  }
}

Pipe.prototype.update = function() {
  for (let i = 0, l = this.interfaces.length; i < l; i++) {
    this.interfaces[i].calculateMassFlows();
  }

  this.checkMassFlows();

  for (let i = 0, l = this.interfaces.length; i < l; i++) {
    this.interfaces[i].resolveMassFlows();
  }
  for (let i = 0, l = this.elements.length; i < l; i++) {
    this.elements[i].update();
  }
}


function Interface (elements) {
  this.elements = elements;
  for (let i = 0, l = this.elements.length; i < l; i++) {
    elements[i].interfaces.push(this);
  }
  this.velocity = 0;
  this.massFlow = 0;
  g_interfaces.push(this);
}

Interface.prototype.calculatePressureForce = function (elm1, elm2) {
  //calculate the force due to pressure gradient between connected elements
  let area = Math.min(elm1.area, elm2.area);
  this.area = area;
  let force = area*(elm1.pressure - elm2.pressure);
  return force;

};

Interface.prototype.calculateGravForce = function (elm1, elm2) {
  //calculate the force due to gravity on the fluid across the interface
  //how to cope with different element ANGLES?
  //do a mass-weighted average of the angles (or directionSines)
  let avgDS = elm1.directionSine;
  let mass = Math.min(elm1.mass, elm2.mass);//0.5*(elm1.mass + elm2.mass);
  if (elm1.directionSine != elm2.directionSine) {
    avgDS = (0.5*elm1.mass/mass)*elm1.directionSine + (0.5*elm2.mass/mass)*elm2.directionSine;
  }

  let force = -1*avgDS*mass*GRAV_ACCN;
  return force;

  // alternatively - work out which of the two elements is uphill
  // use that mass and directionSine for the calculation
  //ie if elm1.pos_start.z > elm2.pos_end, use elm1 mass
};

Interface.prototype.calculateFrictionForce = function (elm1, elm2) {
  //calculate the force due to friction on the fluid across the interface
  //use a length-weighted average of the diameters both elements?
  let avgDiam = Math.min(elm1.diameter, elm2.diameter);
  let L = 0.5*(elm1.elm_length + elm2.elm_length);
  // if(elm1.elm_length != elm2.elm_length) {
  //   avgDiam = (0.5*elm1.elm_length/L)*elm1.diameter + (0.5*elm2.elm_length/L)*elm2.diameter;
  // }
  let force = frictionFactor(avgDiam, this.velocity);
  return force;
};

Interface.prototype.calculateForce = function (elm1, elm2) {
  let force = this.calculatePressureForce(elm1, elm2);
  force += this.calculateGravForce(elm1, elm2);
  return force;
};


Interface.prototype.calculateMassFlows = function () {
  //determine forces
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];
  if(elm1.area > 0 && elm2.area > 0) {
    let force = this.calculateForce(elm1, elm2);
    let mass = 0.5*(elm1.mass + elm2.mass);
    let momentum = mass*this.velocity;
    //apply forces to combined mass
    //from updated velocity, work out how much mass to transfer from one element to another
    momentum += force*TIME_STEP;

    let fac  = FRIC_REF/this.calculateFrictionForce(elm1, elm2);
    if (fac > 1) { fac = 1; }
    // console.log(fac);
    momentum *= Math.pow((fac), FRIC_CONST*TIME_STEP);
    //replace with a factor that depends on pipe parameters, as a fraction of some 'reference pipe' at 'maximum flow speed'


    this.velocity = momentum/mass;
    if (Math.abs(this.velocity) < VELOCITY_THRESHOLD) {this.velocity = 0;}
    this.velocity = Math.round((1/VELOCITY_THRESHOLD)*this.velocity)/(1/VELOCITY_THRESHOLD);
    if (this.velocity > VELOCITY_LIMIT || this.velocity < -1*VELOCITY_LIMIT) {this.velocity = Math.sign(this.velocity)*VELOCITY_LIMIT;}
    this.massFlow = this.velocity*TIME_STEP*Math.min(elm1.area, elm2.area);
    //insert check here for excessive flow across interface

    if (this.velocity < 0) {this.massFlow *= elm2.rho;}
    if (this.velocity > 0) {this.massFlow *= elm1.rho;}

    elm1.flows.push([-1*this.massFlow, this]);
    elm2.flows.push([this.massFlow, this]);

  } else {
    this.velocity = 0;
  }
};

Interface.prototype.resolveMassFlows = function () {
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];
  elm1.mass -= this.massFlow;
  elm2.mass += this.massFlow;
}

let pippy = new Pipe(0.064, 10*ELEMENT_LENGTH, PIPE_ANGLE, {x:0,z:0});
pippy.fill(water);
let testy = pippy.elements[2];
testy.diameter = RESTRICTION_DIAMETER;
testy.fill(water);
testy.update();
pippy.elements[0].fill(water);
pippy.elements[0].update();

console.log(testy.pressure);
console.log(pippy);

let sink1 = new Sink(0.064, ELEMENT_LENGTH, PIPE_ANGLE, pippy.pos_start, 1*PR_W, water);
let sink2 = new Sink(0.064, ELEMENT_LENGTH, PIPE_ANGLE, pippy.pos_end, 1*PR_W, water);

sink1.pos_start.x -= sink1.directionCosine*sink1.elm_length;
sink1.pos_start.z -= sink1.directionSine*sink1.elm_length;

sink1.pos_end = sink1.findPosEnd();
sink1.pos_middle = sink1.findPosMiddle();

connectElements(sink1, pippy.startElement);
connectElements(pippy.endElement, sink2);

for (let i = 0, l = pippy.elements.length; i < l; i++) {
let elm_container = document.getElementsByClassName('elm_container')[0];
  let elm_div = document.createElement('div');
  elm_div.className = 'elm';
  elm_container.appendChild(elm_div);
}

// TESTING ONLY
let elm_divs = document.getElementsByClassName('elm');
function elm_div_opac (elm, div) {
  let op = Math.round(100*(elm.pressure - PR_W)/(PR_W));
  div.style.backgroundColor = 'hsl( 280, 100%, ' + op + '%)';
}




console.log(g_elements);
console.log(g_interfaces);

function visualise() {
  for (let p = 0, l = INTERVALS; p < l; p++){
    for (let i = 0, l = g_interfaces.length; i < l; i++) {
      g_interfaces[i].calculateMassFlows();
      g_interfaces[i].resolveMassFlows();
    }

    for (let i = 0, l = g_elements.length; i < l; i++) {
      g_elements[i].update();
    }



  }

  for (let i = 0, l = pippy.elements.length; i < l; i++) {
    let elm = pippy.elements[i];
    let vel = 0;

    //this is to facilitate flow and speed reporting - still not quite right
    //should average the velocities across an element instead of reporting vel at one end...
    if(pippy.interfaces[i]) {
      vel = pippy.interfaces[i].velocity;
      area = pippy.interfaces[i].area;
    }
    elm_div_opac(elm, elm_divs[i]);
    elm_divs[i].style.height = 100*elm.diameter/0.064 + '%';
    elm_divs[i].innerHTML =  Math.floor(elm.pressure)/1000 + 'kPa <br>'+ Math.round(10000*vel)/10000 + 'm/s <br>' + Math.round(1000*vel*area*1000)/1000 +'L/s';
  }

   requestAnimationFrame (visualise);
}

let viewport = document.getElementsByClassName('viewport')[0];
viewport.addEventListener('click', visualise);

visualise();
