
const K_W = 2.2e9; // Pa
const RHO_W = 997.0; // kg/m^3
const PR_W = 1.015e5; // Pa
const MU_W = 1.787e-6; //m^2/s
const ETA_W = 8.9e-4; //Pa.s
const TIME_STEP = 0.0001; // seconds
const INTERVALS = Math.round(1/TIME_STEP);
const RHO_Crit_W = 9.96955363e2; //pre-calculated critical density that produces cavitation pressure for water
const GRAV_ACCN = 9.8; //ms^-2
const FRIC_CONST = 1000;
const RESTRICTION_DIAMETER = 0.025;
const VELOCITY_LIMIT = 33; //ms^-1
const DIFFUSION_RATE = 10;//TEMPORARY for testing GS-Algorithm
const PIPE_ANGLE = 0.25*Math.PI;
const MOMENTUM_THRESHOLD = 1e-8;


function newDensityFromPressure (pr, pr_ref, rho_ref, K) {
  // let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  let rho_new = rho_ref*(1 + (pr - pr_ref)/K);
  return rho_new;
}

function newPressureFromDensity (rho, rho_ref, pr_ref, K) {
  // let pr_new = K*Math.log(rho/rho_ref);
  let pr_new = pr_ref + K*(rho - rho_ref)/rho_ref;
  return pr_new;
}

function findElementMass (elm) {
  let mass = elm.rho*Math.PI*Math.pow(0.5*elm.diameter, 2)*elm.elm_length;
  return mass;
}

function findElementCrossSectionalArea (elm) {
  let area = Math.PI*Math.pow(0.5*elm.diameter, 2);
  return area;
}

function findElementVolume (elm) {
  let vol = elm.elm_length*elm.area;
  return vol;
}


function calculatePressureForce (elm) {
  let force = 0;
  for (let i = 0, l = elm.neighbours.length; i < l; i++) {
    let sign = 1;
    if (i == 1) {sign = -1;}
    if (elm.neighbours[i]) {
        let neighbour = elm.neighbours[i];
        if (neighbour.type == 'simple') {
          force += sign*(neighbour.pressure)*Math.min(elm.area, neighbour.area);
          if (neighbour.area < elm.area) {
             force += sign*(elm.pressure*(elm.area - neighbour.area));
          }
        }
    } else {
      // console.log('no neighbour on ' + i + ' side');
      force += sign*elm.pressure*elm.area;
    }
  }
  return force;
}

function calculateGravForce (elm) {
  let Fg = -1*GRAV_ACCN*(elm.mass)*elm.directionSine;

  //if there's no element 'downhill' - don't apply a grav force
  //use elm.pos_start.z and _end.z to do this
  // if (!elm.neighbours[0]) {Fg = 0;}
  // if(elm.neighbours) {
  //     if (elm.directionSine > 0 && (!elm.neighbours[0] || elm.neighbours[0].diameter == 0)) {
  //       Fg = 0;
  //     } else if (elm.directionSine < 0 && (!elm.neighbours[1] || elm.neighbours[1].diameter == 0)) {
  //       Fg = 0;
  //     }
  // }
  return Fg;
}

function calculateFrictionForce (elm) {
  let force = 0;
  //force is proportional to the square of velocity, inversely proportional to diameter
    if (elm.momentum != 0) {
      let momentum = elm.momentum;
      let velocity = momentum/(elm.mass);
      //whatever happens - the friction can at most halt the flow, such that abs(momentum - fdt) >= 0
      let fric = -1*FRIC_CONST*elm.elm_length*velocity/elm.diameter;
      // let fric = -1*4*Math.PI*ETA_W*elm.elm_length*velocity;
      force = fric;
    }
  return force;
}


function calculateOutflow (elm, momentum, neighbour) {
  let massFlow = 0;
  if (elm.mass > 0) {
    let velocity = momentum/(elm.mass);
    let area_eff = elm.area;
    if (neighbour) {area_eff = Math.min(elm.area, neighbour.area);}
    massFlow = velocity*TIME_STEP*area_eff;
  //  if (massFlow > elm.mass/2) {massFlow = elm.mass/2;} // really need to dynamically break up the TIME_STEP in these circumstances
    // basically run a series of massflow calculations on the element and its neighbours
  } else {
    massFlow = 0;
  }
  return massFlow;
}

// function calculateVolumetricFlowRate (elm) {
//   let volFlowRate = [0,0];
//     let res = 8*ETA_W*(elm.elm_length/2)/(Math.PI*Math.pow(elm.diameter/2,4));
//     let dP = calculatePressureDiffs(elm);
//
//     for (let i = 0, l = volFlowRate.length; i < l; i++) {
//       volFlowRate[i] = dP[i]/res;
//       if (Math.abs(volFlowRate[i])*TIME_STEP > elm.volume/2) {volFlowRate[i] = Math.sign(volFlowRate[i])*(elm.volume/2)/TIME_STEP}
//     }
//     return volFlowRate;
//   }

function packageOutflows (elm) {
  if (elm.neighbours[1]) { // if there's somewhere for the flow to go...
    if (elm.neighbours[1].diameter > 0) {
      let neighbour = elm.neighbours[1];
      let massFlow = calculateOutflow(elm, elm.momentum, neighbour);
      // add to this element's outflow list.
      // add to the neighbour element's inflow list.
        elm.outflow = {mass: massFlow, momentum: elm.momentum*massFlow/(elm.mass)};
        neighbour.inflow = elm.outflow;
    }
  }
}

function checkMassFlows (elm) {
  // calculate the net outflow for an element.
  // If the outflow is enough to provoke a negative pressure, scale any outbound momenta
  // and recalculate outflows, and inflows into neigbouring elements.
  // This means the flows must be recalculated again for the neighbours too...
  // ...if this happens, 'checkMassFlows' again for the neighbouring elements
  let net_outflow = 0;
  if(elm.outflow){

    if (elm.outflow.mass) {
      net_outflow += elm.outflow.mass;
    }
    if (elm.inflow.mass) {
      net_outflow -= elm.inflow.mass;
    }

  }

  // console.log(net_outflow);
  if (net_outflow > 0 && (elm.mass - net_outflow)/elm.volume < RHO_Crit_W) {
    //work out how much mass flow there should have been to get to just above RHO_Crit_W
    let mass_critical = RHO_Crit_W*elm.volume;
    let massFlow_max = elm.mass - mass_critical;
    // console.log('mf_max = ' + massFlow_max);

    let scale_factor = massFlow_max/(net_outflow);
    //console.log(scale_factor);
      if(elm.momentum > 0 ) {
        elm.momentum = scale_factor*elm.momentum;
      }
    elm.outflow = '';
    packageOutflows(elm);
    checkMassFlows(elm.neighbours[1]);

    //reduce the momenta in each direction by an appropriate percentage
    //repackage the outflows and neighbour inflows (recurse to this function)
  }
}


function resolveMassFlows (elm) {

  let infl = elm.inflow;
  let outfl = elm.outflow;

  if (infl.mass) {elm.mass += infl.mass;}
  if (outfl.mass) {elm.mass -= outfl.mass;}
  if (infl.momentum && infl.momentum != 0) {elm.momentum += infl.momentum;}
  if (outfl.momentum && outfl.momentum != 0) {elm.momentum -= outfl.momentum;}

  // reset inflows & outflows
  elm.inflow = '';
  elm.outflow = '';

  // also learn arrow notation, pls
  // function adder(total, a) {return total + a;}
  // let avgMomentum = elm.momentum.reduce(adder)/elm.momentum.length;
  // console.log(avgMomentum);
   if (elm.momentum > 0 && (!elm.neighbours[1] || elm.neighbours[1].diameter == 0)) {
    elm.momentum *= 0;  //stop or reflect on pipe end
   }

}


function buildDiffusionMatrix (elms) {
    let a = DIFFUSION_RATE*TIME_STEP*elms.length/elms[0].elm_length;
    let A = [];
    for (let i = 0, l = elms.length; i < l; i++) {
      A.push([]);
      let thisElm = elms[i];
      for (let j = 0; j < l; j ++) {
        let result = 0;
        if(i == j){
          result += 1;
          // for each neighbour of thisElm, add the diffused amount
          for (let x of thisElm.neighbours){
            if (x) {result += a*Math.min(thisElm.area, x.area);}
          }
          // seeing as this is symmetric between the elements concerned, could also 'pre-account' for this to save on duplication...
          //but that's a TODO for another time
        } else if (j == i - 1) {
          result -= a*Math.min(thisElm.area, thisElm.neighbours[0].area);;
        }
        else if (j == i + 1) {
          result -= a*Math.min(thisElm.area, thisElm.neighbours[1].area);;
        }
        A[i].push(result);
      }

    }
    return A;
}

function diffuse (elms) {
  let A = buildDiffusionMatrix(elms);
  let new_densities = [];
  for (let i = 0, l = elms.length; i < l; i++){
    new_densities[i] = 0;
  }
  for (let k = 0; k < 10; k++) {
    for (let i = 0, l = elms.length; i < l; i++) {
      let rho_new = elms[i].rho;
      if(i > 0) {
          rho_new -= A[i][i - 1]*new_densities[i - 1];
      }
      if(i < l - 1) {
          rho_new -= A[i][i + 1]*new_densities[i + 1];
      }
      rho_new = rho_new/A[i][i];
      new_densities[i] = rho_new;
    }
  }
  return new_densities;
}

// function advect (elms) {
//   let new_densities = [];
//   for (let i = 0, l = elms.length; i < l; i++) {
//     let pos = elms[i].pos_middle_1d;
//     if (elms[i].velocity) {
//       pos -= elms[i].velocity*TIME_STEP;
//     }
//     if(pos < elms[0].pos_middle_1d && !elms[0].neighbours[0]) {pos = elms[0].pos_middle_1d;}
//     if(pos > elms[l - 1].pos_middle_1d && !elms[l - 1].neighbours[1]) {pos = elms[l - 1].pos_middle_1d;}
//     // try to work out where this pos sits in terms of element 1d positions (i.e. which two elements is it between?)
//     let ip = ["",""];
//     for (let j = 0; j < l; j++) {
//       if (pos > elms[j].pos_middle_1d) {
//         ip[0] = elms[j];
//       } else if (pos < elms[j].pos_middle_1d) {
//         ip[1] = elms[j];
//         break;
//       } else {
//         ip = [elms[j], elms[j]];
//         break;
//       }
//     }
//
//     // work out pos as a percentage of distance between two nearest elms
//     let frac = 0;
//     if(ip[1] != ip[0]){
//       frac = (pos - ip[0].pos_middle_1d)/(ip[1].pos_middle_1d - ip[0].pos_middle_1d);
//     }
//     let new_rho = ip[0].rho + frac*(ip[1].rho - ip[0].rho);
//     new_densities.push(new_rho);
//
//   }
//   return new_densities;
// }

function Element(diameter, length, angle, pos_start){
  this.diameter = diameter;
  this.elm_length = length;
  this.area = this.findArea();
  this.volume = this.findVolume();

  this.angle = angle;
  this.directionSine = Math.sin(this.angle);
  this.directionCosine = Math.cos(this.angle);
  if (pos_start) {this.pos_start = pos_start;} else {pos_start = {x:0, z:0};}
  this.pos_end = this.findPosEnd();
  this.pos_middle = this.findPosMiddle();
  this.pressure =  PR_W;
  this.velocity =  0; //ms^-1
  this.type =  'simple';

  this.neighbours = ['',''];
  this.momentum = 0;
  this.outflow = '';
  this.inflow = '';
  this.interfaces = [];

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





function Interface (elements) {
  this.elements = elements;
  for (let i = 0, l = this.elements.length; i < l; i++) {
    elements[i].interfaces.push(this);
  }

  this.velocity = 0;
}

Interface.prototype.calculatePressureForce = function (elm1, elm2) {
  //calculate the force due to pressure gradient between connected elements
  let area = Math.min(elm1.area, elm2.area);
  let force = area*(elm1.pressure - elm2.pressure);
  return force;
};

Interface.prototype.calculateGravForce = function (elm1, elm2) {
  //calculate the force due to gravity on the fluid across the interface
  //how to cope with different element ANGLES?
  //do a mass-weighted average of the angles (or directionSines)
  let avgDS = 0;
  let mass = elm1.mass + elm2.mass;
  if (elm1.directionSine != elm2.directionSine) {
    avgDS = (elm1.mass/mass)*elm1.directionSine + (elm2.mass/mass)*elm2.directionSine;
  } else {
    avgDS = elm1.directionSine;
  }

  let force = -1*avgDS*mass*GRAV_ACCN;
  return force;
};

Interface.prototype.calculateFrictionForce = function (elm1, elm2) {
  //calculate the force due to friction on the fluid across the interface
  //use a length-weighted average of the diameters both elements
  let avgDiam = 0;
  let L = elm1.elm_length + elm2.elm_length;
  if(elm1.elm_length != elm2.elm_length) {
    avgDiam = (elm1.elm_length/L)*elm1.diameter + (elm2.elm_length/L)*elm2.diameter;
  } else {
    avgDiam = elm1.diameter;
  }

  let force = -1*FRIC_CONST*L*this.velocity/avgDiam;
  return force;
};

Interface.prototype.calculateForce = function (elm1, elm2) {
  let force = this.calculatePressureForce(elm1, elm2);
  force += this.calculateGravForce(elm1, elm2);
  return force;
};

Interface.prototype.resolveMassFlows = function () {
  //determine forces
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];
  let force = this.calculateForce(elm1, elm2);
  // console.log(elm1.pressure, elm2.pressure);
  let mass = 0.5*(elm1.mass + elm2.mass);
  let momentum = mass*this.velocity;
  //apply forces to combined mass
  //from updated velocity, work out how much mass to transfer from one element to another
  momentum += force*TIME_STEP;

  let fr_momentum = momentum + this.calculateFrictionForce(elm1, elm2)*TIME_STEP;
  if (fr_momentum/momentum < 0) {
    momentum = 0;
  }

  this.velocity = momentum/mass;
  let massFlow = this.velocity*TIME_STEP*Math.min(elm1.area, elm2.area);
  if (this.velocity < 0) {massFlow *= elm2.rho;}
  if (this.velocity > 0) {massFlow *= elm1.rho;}

  elm1.mass -= massFlow;
  elm2.mass += massFlow;

};

let crom = new Element(0.064, 0.2, PIPE_ANGLE, {x:0,z:0});
console.log(crom);

let crom2 = new Element(0.064, 0.2, PIPE_ANGLE, {x:0,z:0});
console.log(crom2);

crom.pressure = PR_W;
crom2.pressure = 1.1*PR_W;
crom.newDensityFromPressure(PR_W, RHO_W, K_W);
crom.findMass();
crom2.newDensityFromPressure(PR_W, RHO_W, K_W);
crom2.findMass();

let inty = new Interface([crom,crom2]);



console.log(inty);

for(let i = 0; i < 2500; i++){
  inty.resolveMassFlows();
  crom.findDensity();
  crom.newPressureFromDensity(PR_W, RHO_W, K_W);
  crom2.findDensity();
  crom2.newPressureFromDensity(PR_W, RHO_W, K_W);
  console.log(crom.pressure, crom2.pressure);
}




let elm_container = document.getElementsByClassName('elm_container')[0];

//create a list of elements
let elm_list = [];

for(let i = 0, l = 20; i < l; i++) {
  let elm = {
    pos_start: {x: 0, z: 0},
    pos_end: {x: 0, z: 0},
    pos_middle: {x: 0, z: 0},
    angle: PIPE_ANGLE, //radians, vertically above horizontal
    diameter: 0.064, // m
    elm_length: 0.2, // m
    pressure: PR_W, //Pa
    velocity: 0, //ms^-1
    type: 'simple',

    neighbours: ["",""],
    momentum: 0,
    outflow: '',
    inflow: '',
  }

  elm_list.push(elm);


  if(i == 0) {
    elm.pos_start_1d = 0;
  } else {
    elm.pos_start_1d = elm_list[i-1].pos_end_1d;
  }
  elm.pos_middle_1d = elm.pos_start_1d + 0.5*elm.elm_length;
  elm.pos_end_1d = elm.pos_start_1d + elm.elm_length;

  // if (i >= l/2) {
  //   elm.angle *= -1;
  // }

  if (i > 0) {
    elm.pos_start.x = elm_list[i-1].pos_end.x;
    elm.pos_start.z = elm_list[i-1].pos_end.z;
  }

  if('angle' in elm && 'pos_start' in elm && 'elm_length' in elm ) {

    elm.directionSine = Math.sin(elm.angle);
    elm.directionCosine = Math.cos(elm.angle);
  } else if ('pos_start' in elm && 'pos_start' in elm) {
    let dz = elm.pos_end.z - elm.pos_start.z;
    let dx = elm.pos_end.x - elm.pos_start.x;
    elm.angle = Math.atan(dz/dx);
    elm.elm_length = Math.sqrt(Math.pow(dz, 2) + Math.pow(dx, 2));
    elm.directionSine = dz/elm.elm_length;
    elm.directionCosine = dx/elm.elm_length;
  }

  elm.pos_end.x = elm.pos_start.x + elm.elm_length*elm.directionCosine;
  elm.pos_end.z = elm.pos_start.z + elm.elm_length*elm.directionSine;

  elm.pos_middle.x = (elm.pos_start.x + elm.pos_end.x)/2;
  elm.pos_middle.z = (elm.pos_start.z + elm.pos_end.z)/2;

  elm.rho = newDensityFromPressure(elm.pressure, PR_W, RHO_W, K_W);
  elm.mass = findElementMass(elm);
  elm.area = findElementCrossSectionalArea(elm);
  elm.volume = findElementVolume(elm);
  let elm_div = document.createElement('div');
  elm_div.className = 'elm';
  elm_container.appendChild(elm_div);
}

for (let i = 0, l = elm_list.length; i < l; i++) {
  let elm = elm_list[i];
  if (i != 0) {elm.neighbours[0] = elm_list[i - 1];}
  if (i != l - 1) {elm.neighbours[1] = elm_list[i + 1]};
}


// TESTING ONLY
let elm_divs = document.getElementsByClassName('elm');
function elm_div_opac (elm, div) {
  let op = Math.round(100*(elm.pressure - PR_W)/(PR_W));
  div.style.backgroundColor = 'hsl( 280, 100%, ' + op + '%)';
}

let middle_elm = elm_list[Math.ceil(elm_list.length/2)];


elm_list[0].pressure = 3*PR_W;
elm_list[0].rho = newDensityFromPressure(elm_list[0].pressure, PR_W, RHO_W, K_W);
elm_list[0].mass = findElementMass(elm_list[0]);

middle_elm.diameter = RESTRICTION_DIAMETER;
middle_elm.area = findElementCrossSectionalArea(middle_elm);
middle_elm.volume = findElementVolume(middle_elm);
middle_elm.mass = findElementMass(middle_elm);
middle_elm.rho = middle_elm.mass/middle_elm.volume;
// middle_elm.velocity = 1000;
// middle_elm.momentum = middle_elm.velocity*middle_elm.mass;

//////////////////////



function visualise() {
  for (let p = 0, l = INTERVALS; p < l; p++){

     for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];

      let force_p = calculatePressureForce(elm);
      let force_g = calculateGravForce(elm);
      let force_f = calculateFrictionForce(elm);



        // let velocity = elm.momentum/(elm.mass);
        // if (velocity > VELOCITY_LIMIT || velocity < -1*VELOCITY_LIMIT) {
        //   velocity = Math.sign(velocity)*VELOCITY_LIMIT;
        //   elm.momentum = velocity*(elm.mass);
        // }
        elm.momentum += (force_p + force_g)*TIME_STEP;
        let momentum_old = elm.momentum;
         // elm.momentum *= 0.001;
        elm.momentum += (force_f)*TIME_STEP;
        if (elm.momentum/momentum_old < 0) {elm.momentum = 0;}
        if (Math.abs(elm.momentum) < MOMENTUM_THRESHOLD) {elm.momentum = 0;}
    }


    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];
      packageOutflows(elm);
    }

    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];
      checkMassFlows(elm);
    }

    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];

      resolveMassFlows(elm);
      // if(i == 3) {console.log(elm.momentum);}

    }
    // recalculate densities, pressures, ready for the next cycle!


    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];
      elm.rho = elm.mass/elm.volume;
      elm.pressure = newPressureFromDensity(elm.rho, RHO_W, PR_W, K_W);
    }

      // let new_rho = diffuse(elm_list);
      // for (let i = 0, l = elm_list.length; i < l; i++) {
      //   let elm = elm_list[i];
      //   elm.rho = new_rho[i];
      //   elm.pressure = newPressureFromDensity(elm.rho, RHO_W, PR_W, K_W);
      //
      // }




}
  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    elm_div_opac(elm, elm_divs[i]);
    elm_divs[i].style.height = 100*elm.diameter/0.064 + '%';
    elm_divs[i].innerHTML =  Math.floor(elm.pressure)/1000 + 'kPa <br>'+ 2*Math.round(1000*elm.momentum/elm.mass)/1000 + 'm/s';
  }

   requestAnimationFrame (visualise);
}

let viewport = document.getElementsByClassName('viewport')[0];
viewport.addEventListener('click', visualise);

visualise();
