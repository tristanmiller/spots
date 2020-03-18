// Simple fluid physics model for SPOTS
//// Calculate net force on an element of fluid
//// Accelerate the fluid
//// Calculate mass flows
//// Update element contents
//// Calculate pressures

//// use a 2d momentum or velocity model
//// shouldn't require too much pythagorising as we can work in each dimension separately (aside from friction with a v^2 dependence?)
//// this is purely to allow the net force on the fluid in an element to be calculated consistently.
//// direction changes are handled at JUNCTIONS which simply convert directions, without themselves storing fluid

//// elevation also included in model to allow for gravitational gradients

//// also we can include air in the model - it can creep into an element from neighbouring elements, creating sub-elements as it does
//// normally each type of fluid will block each other but there's a tuneable threshold for pass-through e.g. if the right conditions are met, fluids can flow past each other (bubbling)
//// how to account for buoyancy? Or will this naturally arise in the force-balance?

//CALCULATIONS

/// Momentum

//// dp_hydraulic = (1D vector sum of pressure-derived forces)*dt
//// dp_grav = -dt*mg*dHeight)/(length of pipe element)
//// dp_friction = -dt*constant*v^2*(length of pipe element)/(diameter of pipe element)  The constant will be dependent on the fluid and the element material

//// dp = dp_hydraulic + dp_grav + dp_friction
//// p = p + dp

/// Mass flow

//// m_out = v*A*dt*rho
////  m_in = whatever is calculated from neighbouring elements

//// P = some function of density (perhaps also on temp?)

// INITIAL SCENARIO
// This should make use of all of the basic features of the simulation
/// An elevated water tank that can feed a system of pipes via a valve. The tank also has an air valve to prevent vacuum from forming in the top of the tank as it drains.
/// The pipes are initially full of air. There are valves in the way of the air
/// One of the outlets is oriented vertically so that the fluids have to be elevated to escape.


/* AIR -> VALVE -> TANK -> VALVE(S) -> OUTLETS -> VALVE(S)
*/


// OBJECTS
/// Pipe element
//// mass (of fluid)
//// pressure
//// density
//// momentum

//// diameter
//// length
//// material (roughness)
//// elasticity (later - for collapsible hoses)

//// coordinates (3d)
//// orientation (3d) - azimuth-altitude

//// elements it is connected to

const K_W = 2.2e9; // Pa
const RHO_W = 997; // kg/m^3
const PR_W = 1.015e5; // Pa
const TIME_STEP = 0.0005; // seconds



function newDensityFromPressure (pr, pr_ref, rho_ref, K) {
  // let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  let rho_new = rho_ref*(1 + (pr - pr_ref)/K);
  return rho_new;
}

function newPressureFromDensity (rho, rho_ref, pr_ref, K) {
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

function calculatePressureForces (elm) {
  let forces = [0, 0];
  for (let i = 0, l = elm.neighbours.length; i < l; i++) {
    let sign = 1;
    if (i == 1) {sign = -1;}
    if (elm.neighbours[i]) {
        let neighbour = elm.neighbours[i];
        if (neighbour.type == 'simple') {
          forces[i] = sign*(neighbour.pressure - elm.pressure)*Math.min(elm.area, neighbour.area);
        }
    } else {
      // console.log('no neighbour on ' + i + ' side');
      forces[i] += 0;
    }
  }
  return forces;
}

function calculateOutflow (elm, momentum) {
  let massFlow = 0;
  if (elm.mass > 0) {
    let velocity = momentum/(elm.mass/2); // since we're dealing with only half of an element (left or right side)
    massFlow = Math.abs(velocity*TIME_STEP*elm.area);
    if (massFlow > elm.mass/2) {massFlow = elm.mass/2;} // really need to dynamically break up the TIME_STEP in these circumstances
    // basically run a series of massflow calculations on the element and its neighbours

  } else {
    massFlow = 0;
  }
  return massFlow;
}

function packageOutflows (elm) {
  for (let i = 0, l = elm.neighbours.length; i < l; i++) {
    if (elm.neighbours[i]) { // if there's somewhere for the flow to go...
      let massFlow = calculateOutflow(elm, elm.momentum[i]);
      if ((i == 0 && elm.momentum[i] < 0) || (i == 1 && elm.momentum[i] > 0)) {
      // add to this element's outflow list.

        elm.outflows[i] = {mass: massFlow, momentum: elm.momentum[i]*massFlow/(elm.mass/2)};
        elm.neighbours[i].inflows[(i - 1)*(i - 1)] = {mass: massFlow, momentum: elm.momentum[i]*massFlow/(elm.mass/2)};
      // add to the neighbour element's inflow list.
      }
    }
  }
}

function resolveMassFlows (elm) {
  for (let i = 0, l = elm.inflows.length; i < l; i++) {
    let infl = elm.inflows;
    let outfl = elm.outflows;

    if (infl[i].mass > 0) {elm.mass += infl[i].mass;}
    if (outfl[i].mass > 0) {elm.mass -= outfl[i].mass;}
    if (infl[i].momentum && infl[i].momentum != 0) {elm.momentum[i] += infl[i].momentum;}
    if (outfl[i].momentum && outfl[i].momentum != 0) {elm.momentum[i] += outfl[i].momentum;}

    // reset inflows & outflows
    elm.inflows[i] = "";
    elm.outflows[i] = "";

  }
  // also learn arrow notation, pls
  function adder(total, a) {return total + a;};
  let avgMomentum = elm.momentum.reduce(adder)/elm.momentum.length;
  // if (avgMomentum < 0 && !elm.neighbours[0] || avgMomentum > 0 && !elm.neighbours[1]) {
  //   avgMomentum = -1*avgMomentum;  //reflect on pipe end
  // }
  //distribute this to each 'side' of the element
  for (let i = 0, l = elm.momentum.length; i < l; i++) {
    elm.momentum[i] = avgMomentum;
  }
}



let elm_container = document.getElementsByClassName('elm_container')[0];

//create a list of elements
let elm_list = [];

for(let i = 0; i < 30; i++) {
  let elm = {
    diameter: 0.064, // m
    elm_length: 0.50, // m
    pressure: PR_W, //Pa
    type: 'simple',
    angle: 0,
    neighbours: ["",""],
    momentum: [0, 0],
    outflows: ["",""],
    inflows: ["",""],
  }

  elm_list.push(elm);

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
  let op = Math.round(100*(elm.pressure)/3e5)%100;
  div.style.backgroundColor = 'hsl( 280, ' + op + '%, 50%)';
}

let middle_elm = elm_list[Math.ceil(elm_list.length/2)];


middle_elm.pressure = 3e6;
middle_elm.density = newDensityFromPressure(middle_elm.pressure, PR_W, RHO_W, K_W);
//////////////////////


function visualise() {

  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    let forces = calculatePressureForces(elm);
    elm.momentum[0] += forces[0]*TIME_STEP;
    elm.momentum[1] += forces[1]*TIME_STEP;

  }

  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    packageOutflows(elm);
  }

  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    resolveMassFlows(elm);
  }


  // let total_mass = elm1.mass + elm2.mass + elm3.mass;
  // let total_momentum = elm1.momentum[0] + elm1.momentum[1] + elm2.momentum[0] + elm2.momentum[1] + elm3.momentum[0] + elm3.momentum[1];
  // console.log("Mass, momentum: " + total_mass, total_momentum);


  // recalculate densities, pressures, ready for the next cycle!
  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    elm.rho = elm.mass/elm.volume;
    elm.pressure = newPressureFromDensity(elm.rho, RHO_W, PR_W, K_W);
  }

  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    elm_div_opac(elm, elm_divs[i]);
  }

  requestAnimationFrame (visualise);
}

visualise();
