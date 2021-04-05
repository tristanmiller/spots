
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

const TIME_STEP = 1/60; // seconds
const INTERVALS = 1000;
const TIME_SUBSTEP = TIME_STEP/INTERVALS;
const DIFFUSION_CONSTANT = 0.001;

const GRAV_ACCN = 9.8; //ms^-2
const FRIC_CONST = 1; //global friction constant - should be a function of medium and hose material
const VELOCITY_LIMIT = 1000; //ms^-1 //little hack to stop things getting too crazy
const VELOCITY_THRESHOLD = 1e-8;  //how much precision for velocity?

const SUB_STEPS = 10;
const RECURSION_LIMIT = 0;
const MULTIPHASE_MIN_LENGTH = 0.1; //length at which an element's original length is reinstated

const ELEMENT_LENGTH = 1; //metres
const PIPE_ANGLE = 0*Math.PI; //radians
const PIPE_DIAMETER = 0.064; //metres
const RESTRICTION_DIAMETER = 0.05; //metres
let g_interfaces = [];
let g_elements = [];

function connectElements (elm1, elm2) {
  //determine relative position of each element
  //the 'down' element will have a greater x position
  // or, failing that, a greater z position
  // or, failing that, be the second element listed

  let dx = elm2.pos_start.x - elm1.pos_start.x;
  let dz = elm2.pos_start.z - elm1.pos_start.z;

  if (dx != 0) {
    if (dx > 0) {
      //elm2 is down of elm1, elm1 is up of elm2
      elm1.neighbours.down.push(elm2);
      elm2.neighbours.up.push(elm1);
    } else {
      //elm1 is down of elm2, elm2 is up of elm1
      elm1.neighbours.up.push(elm2);
      elm2.neighbours.down.push(elm1);
    }
  } else if (dz != 0) {
    if (dz > 0) {
      //elm2 is down of elm1, elm1 is up of elm2
      elm1.neighbours.down.push(elm2);
      elm2.neighbours.up.push(elm1);
    } else {
      //elm1 is down of elm2, elm2 is up of elm1
      elm1.neighbours.up.push(elm2);
      elm2.neighbours.down.push(elm1);
    }
  } else {
    //elm2 is down of elm1, elm1 is up of elm2
    elm1.neighbours.down.push(elm2);
    elm2.neighbours.up.push(elm1);
  }


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

let sink1 = new Sink(PIPE_DIAMETER, ELEMENT_LENGTH, PIPE_ANGLE, {x:0,z:0}, 1.4*water.PR, water);
let pippy = new Pipe(PIPE_DIAMETER, 20*ELEMENT_LENGTH, PIPE_ANGLE, {x:0,z:0});
pippy.fill(water);
let testy = pippy.elements[3];
testy.diameter = RESTRICTION_DIAMETER;
testy.fill(water, 1.2*water.PR);
console.log(testy);
testy.update();
pippy.elements[0].fill(water, water.PR);
pippy.elements[0].update();

console.log(testy.pressure);
console.log(pippy);


let sink2 = new Sink(PIPE_DIAMETER, ELEMENT_LENGTH, PIPE_ANGLE, pippy.pos_end, 1.00*water.PR, water);

sink1.pos_start.x -= sink1.directionCosine*sink1.elm_length;
sink1.pos_start.z -= sink1.directionSine*sink1.elm_length;

sink1.pos_end = sink1.findPosEnd();
sink1.pos_middle = sink1.findPosMiddle();

connectElements(sink1, pippy.startElement);
connectElements(pippy.endElement, sink2);

for (let i = 0, l = g_elements.length; i < l; i++) {
let elm_container = document.getElementsByClassName('elm_container')[0];
  let elm_div = document.createElement('div');
  elm_div.className = 'elm';
  if(g_elements[i].type == 'sink') {elm_div.classList.add('sink');}
  elm_container.appendChild(elm_div);
}

// TESTING ONLY
let elm_divs = document.getElementsByClassName('elm');
function elm_div_opac (elm, div) {
  let op = Math.round(100*(elm.pressure)/(2*PR_W));
  // op = 50;
  if(elm.fluid == water){
    div.style.backgroundColor = 'hsl( 280, 100%, ' + op + '%)';
  }
  if(elm.fluid == air) {
    div.style.backgroundColor = 'hsl( 140, 100%, ' + op + '%)';
  }
}




console.log(g_elements);
// console.log(g_interfaces);

function visualise() {
  for (let p = 0, l = INTERVALS; p < l; p++){
    // for (let i = 0, l = g_interfaces.length; i < l; i++) {
    //   g_interfaces[i].calculateMassFlows();
    //   g_interfaces[i].resolveMassFlows();
    // }

    for (let i = 0, l = g_elements.length; i < l; i++) {

      g_elements[i].update();
      g_elements[i].diffuse();
      // g_elements[i].calculatePressureForce();
      g_elements[i].convertVelocityToFlows();

    }
  }

  for (let i = 0, l = g_elements.length; i < l; i++) {
    let elm = g_elements[i];
    elm.applyFlows();
    let vel = 0;

    //this is to facilitate flow and speed reporting - still not quite right
    //should average the velocities across an element instead of reporting vel at one end...
    // if(g_interfaces[i]) {
    //   vel = g_interfaces[i].velocity;
    //   area = g_interfaces[i].area;
    // }
    elm_div_opac(elm, elm_divs[i]);
    elm_divs[i].style.height = 100*elm.diameter/0.064 + '%';
    elm_divs[i].style.flexGrow = elm.elm_length;
    elm_divs[i].innerHTML =  Math.floor(elm.pressure)/1000 + 'kPa <br>'+ Math.round(10000*elm.velocity)/10000 + 'm/s <br>';
  }

  requestAnimationFrame (visualise);
}

let viewport = document.getElementsByClassName('viewport')[0];
viewport.addEventListener('click', visualise);

visualise();
