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
const RHO_W = 1.0; // g/cm^3
const PR_W = 1e5; // Pa

function newDensityFromPressure (pr, pr_ref, rho_ref, K) {
  let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  return rho_new;
}

function newPressureFromDensity (rho, rho_ref, pr_ref, K) {
  let pr_new = pr_ref + K*(rho - rho_ref)/rho;
  return pr_new;
}

function findElementMass (elm) {
  let mass = elm.rho*Math.PI*Math.pow(0.5*elm.d/10, 2)*elm.l/10;
  return mass;
}

let elm1 = {
  d: 64, // mm
  l: 100, // mm
  pr: 1e6, //Pa
}

elm1.rho = newDensityFromPressure(elm1.pr, PR_W, RHO_W, K_W);
elm1.m = findElementMass(elm1);

console.log(elm1);

let elm2 = {
  d: 64, // mm
  l: 100, // mm
  rho: 3, // g/cm^3
}

elm2.m = findElementMass(elm2);
elm2.pr = newPressureFromDensity(elm2.rho, RHO_W, PR_W, K_W);

console.log(elm2);
