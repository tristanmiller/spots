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
const PR_W = 1e5; // Pa
const TIME_STEP = 0.001; // seconds



function newDensityFromPressure (pr, pr_ref, rho_ref, K) {
  let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  return rho_new;
}

function newPressureFromDensity (rho, rho_ref, pr_ref, K) {
  let pr_new = pr_ref + K*(rho - rho_ref)/rho;
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
  } else {
    massFlow = 0;
  }
  return massFlow;
}

function packageOutflows (elm) {
  for (let i = 0, l = elm.neighbours.length; i < l; i++) {
    let massFlow = calculateOutflow(elm, elm.momentum[i]);
    if ((i == 0 && elm.momentum[i] < 0) || (i == 1 && elm.momentum[i] > 0)) {
      // add to this element's outflow list.
      elm.outflows[i] = {mass: massFlow, momentum: elm.momentum[i]*massFlow/(elm.mass/2)};
      if (elm.neighbours[i]) {
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
  //distribute this to each 'side' of the element
  for (let i = 0, l = elm.momentum.length; i < l; i++) {
    elm.momentum[i] = avgMomentum;
  }
}

let elm1 = {
  diameter: 0.064, // m
  elm_length: 0.1, // m
  pressure: 1e5, //Pa
  type: 'simple',
  angle: 0, //radians, relative to positive x-direction
  neighbours: ["",""],
  momentum: [0, 0],
  outflows: ["",""],
  inflows: ["",""],
}

elm1.rho = newDensityFromPressure(elm1.pressure, PR_W, RHO_W, K_W);
elm1.mass = findElementMass(elm1);
elm1.area = findElementCrossSectionalArea(elm1);
elm1.volume = findElementVolume(elm1);

let elm2 = {
  diameter: 0.064, // m
  elm_length: 0.100, // m
  pressure: 1.1e5, //Pa
  type: 'simple',
  angle: 0,
  neighbours: ["",""],
  momentum: [0, 0],
  outflows: ["",""],
  inflows: ["",""],
}


elm2.rho = newDensityFromPressure(elm2.pressure, PR_W, RHO_W, K_W);
elm2.mass = findElementMass(elm2);
elm2.area = findElementCrossSectionalArea(elm2);
elm2.volume = findElementVolume(elm1);

let elm3 = {
  diameter: 0.064, // m
  elm_length: 0.100, // m
  pressure: 1.0e5, //Pa
  type: 'simple',
  angle: 0,
  neighbours: ["",""],
  momentum: [0, 0],
  outflows: ["",""],
  inflows: ["",""],
}

elm3.rho = newDensityFromPressure(elm3.pressure, PR_W, RHO_W, K_W);
elm3.mass = findElementMass(elm3);
elm3.area = findElementCrossSectionalArea(elm3);
elm3.volume = findElementVolume(elm1);


elm1.neighbours[1] = elm2;
elm2.neighbours[0] = elm1;
elm2.neighbours[1] = elm3;
elm3.neighbours[0] = elm2;

for (let j = 0; j < 100; j++) {
console.log(j);
let f1 = calculatePressureForces(elm1);
elm1.momentum[0] += f1[0]*TIME_STEP;
elm1.momentum[1] += f1[1]*TIME_STEP;
let f2 = calculatePressureForces(elm2);
elm2.momentum[0] += f2[0]*TIME_STEP;
elm2.momentum[1] += f2[1]*TIME_STEP;
let f3 = calculatePressureForces(elm3);
elm3.momentum[0] += f3[0]*TIME_STEP;
elm3.momentum[1] += f3[1]*TIME_STEP;
// console.log(f1, f2, f3);
// console.log(elm1.momentum, elm2.momentum, elm3.momentum);

packageOutflows(elm1);
packageOutflows(elm2);
packageOutflows(elm3);

console.log(elm1.outflows[0], elm1.outflows[1]);
console.log(elm2.outflows[0], elm2.outflows[1]);
console.log(elm3.outflows[0], elm3.outflows[1]);


resolveMassFlows(elm1);
resolveMassFlows(elm2);
resolveMassFlows(elm3);


let total_mass = elm1.mass + elm2.mass + elm3.mass;
let total_momentum = elm1.momentum[0] + elm1.momentum[1] + elm2.momentum[0] + elm2.momentum[1] + elm3.momentum[0] + elm3.momentum[1];
console.log("Mass, momentum: " + total_mass, total_momentum);

// recalculate densities, pressures, ready for the next cycle!
elm1.rho = elm1.mass/elm1.volume;
elm2.rho = elm2.mass/elm2.volume;
elm3.rho = elm3.mass/elm3.volume;

elm1.pressure = newPressureFromDensity(elm1.rho, RHO_W, PR_W, K_W);
elm2.pressure = newPressureFromDensity(elm2.rho, RHO_W, PR_W, K_W);
elm3.pressure = newPressureFromDensity(elm3.rho, RHO_W, PR_W, K_W);

console.log(elm1.pressure, elm2.pressure, elm3.pressure);
}
