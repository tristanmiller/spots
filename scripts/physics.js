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
const RHO_W = 997.0; // kg/m^3
const PR_W = 1.015e5; // Pa
const MU_W = 1.787e-6; //m^2/s
const ETA_W = 8.9e-4; //Pa.s
const TIME_STEP = 0.01; // seconds
const INTERVALS = Math.round(1/TIME_STEP);
const RHO_Crit_W = 9.96955363e2; //pre-calculated critical density that produces cavitation pressure for water
const GRAV_ACCN = 9.8; //ms^-2
const FRIC_CONST = 2 ;
const RESTRICTION_DIAMETER = 0.064;
const VELOCITY_LIMIT = 33; //ms^-1
const DIFFUSION_RATE = 0.1//TEMPORARY for testing GS-Algorithm

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

function calculatePressureDiffs (elm) {
  let dP = [0, 0];
  for (let i = 0, l = elm.neighbours.length; i < l; i++) {
    let sign = 1;
    if (i == 1) {sign = -1;}
    if (elm.neighbours[i]) {
        let neighbour = elm.neighbours[i];
        if (neighbour.type == 'simple' && neighbour.diameter > 0) {
          dP[i] = sign*(neighbour.pressure - elm.pressure)
        }
    } else {
      // console.log('no neighbour on ' + i + ' side');
      dP[i] += 0;
    }
  }
  return dP;
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
  return Fg;
}

function calculateFrictionForce (elm) {
  let force = 0;
  let velocity = elm.momentum/(elm.mass/2);

      //whatever happens - the friction can at most halt the flow, such that abs(momentum - fdt) >= 0
      //let fric = -1*FRIC_CONST*elm.elm_length*velocity/elm.diameter;
      let Ff = -1*FRIC_CONST*4*Math.PI*ETA_W*elm.elm_length*velocity;
      force = Ff;

  return force;
}

//
// function calculateOutflow (elm, momentum, neighbour) {
//   let massFlow = 0;
//   if (elm.mass > 0) {
//     let velocity = momentum/(elm.mass/2); // since we're dealing with only half of an element (left or right side)
//     let area_eff = elm.area;
//     if (neighbour) {area_eff = Math.min(elm.area, neighbour.area)}
//     massFlow = Math.abs(velocity*TIME_STEP*area_eff);
//     if (massFlow > elm.mass/2) {massFlow = elm.mass/2;} // really need to dynamically break up the TIME_STEP in these circumstances
//     // basically run a series of massflow calculations on the element and its neighbours
//   } else {
//     massFlow = 0;
//   }
//   return massFlow;
// }
//
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
//
// function packageOutflows (elm) {
//   for (let i = 0, l = elm.neighbours.length; i < l; i++) {
//     if (elm.neighbours[i]) { // if there's somewhere for the flow to go...
//       if (elm.neighbours[i].diameter > 0) {
//         let massFlow = calculateOutflow(elm, elm.momentum[i], elm.neighbours[i]);
//         if ((i == 0 && elm.momentum[i] < 0) || (i == 1 && elm.momentum[i] > 0)) {
//         // add to this element's outflow list.
//         // add to the neighbour element's inflow list.
//           elm.outflows[i] = {mass: massFlow, momentum: elm.momentum[i]*massFlow/(elm.mass/2)};
//           elm.neighbours[i].inflows[(i - 1)*(i - 1)] = elm.outflows[i];
//         }
//       }
//     }
//   }
// }
//
// function checkMassFlows (elm) {
//   // calculate the net outflow for an element.
//   // If the outflow is enough to provoke a negative pressure, scale any outbound momenta
//   // and recalculate outflows, and inflows into neigbouring elements.
//   // This means the flows must be recalculated again for the neighbours too...
//   // ...if this happens, 'checkMassFlows' again for the neighbouring elements
//   let net_outflow = 0;
//   if(elm.outflows){
//     for (let i = 0, l = elm.outflows.length; i < l; i++) {
//       if (elm.outflows[i].mass) {
//         net_outflow += elm.outflows[i].mass;
//       }
//       if (elm.inflows[i].mass) {
//         net_outflow -= elm.inflows[i].mass;
//       }
//     }
//   }
//
//   // console.log(net_outflow);
//   if (net_outflow > 0 && (elm.mass - net_outflow)/elm.volume < RHO_Crit_W) {
//     //work out how much mass flow there should have been to get to just above RHO_Crit_W
//     let mass_critical = RHO_Crit_W*elm.volume;
//     let massFlow_max = elm.mass - mass_critical;
//     // console.log('mf_max = ' + massFlow_max);
//
//     let scale_factor = massFlow_max/(net_outflow);
//     //console.log(scale_factor);
//     for (let i = 0, l = elm.momentum.length; i < l; i++) {
//       if(elm.momentum[i] < 0 && i == 0 || elm.momentum[i] > 0 && i == 1) {
//         //console.log(elm.momentum[i]);
//         elm.momentum[i] = scale_factor*elm.momentum[i];
//         //console.log(elm.momentum[i]);
//       }
//     }
//     elm.outflows = ['', ''];
//     packageOutflows(elm);
//     for (let i = 0, l = elm.neighbours.length; i < l; i++) {
//       checkMassFlows(elm.neighbours[i]);
//     }
//     //reduce the momenta in each direction by an appropriate percentage
//     //repackage the outflows and neighbour inflows (recurse to this function)
//   }
// }
//
//
// function resolveMassFlows (elm) {
//   for (let i = 0, l = elm.inflows.length; i < l; i++) {
//     let infl = elm.inflows;
//     let outfl = elm.outflows;
//
//     if (infl[i].mass > 0) {elm.mass += infl[i].mass;}
//     if (outfl[i].mass > 0) {elm.mass -= outfl[i].mass;}
//     if (infl[i].momentum && infl[i].momentum != 0) {elm.momentum[i] += infl[i].momentum;}
//     if (outfl[i].momentum && outfl[i].momentum != 0) {elm.momentum[i] += outfl[i].momentum;}
//
//     // reset inflows & outflows
//     elm.inflows[i] = "";
//     elm.outflows[i] = "";
//   }
//   // also learn arrow notation, pls
//   function adder(total, a) {return total + a;};
//   let avgMomentum = elm.momentum.reduce(adder)/elm.momentum.length;
//    if (avgMomentum < 0 && ( !elm.neighbours[0] || elm.neighbours[0].diameter == 0) || avgMomentum > 0 && (!elm.neighbours[1] || elm.neighbours[1].diameter == 0)) {
//      avgMomentum = -1*avgMomentum;  //reflect on pipe end
//    }
//   //distribute this to each 'side' of the element
//   for (let i = 0, l = elm.momentum.length; i < l; i++) {
//     elm.momentum[i] = avgMomentum;
//   }
// }


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

function advect (elms) {
  let new_densities = [];
  for (let i = 0, l = elms.length; i < l; i++) {
    let pos = elms[i].pos_middle_1d;
    if (elms[i].velocity) {
      pos -= elms[i].velocity*TIME_STEP;
    }
    if(pos < elms[0].pos_middle_1d && !elms[0].neighbours[0]) {pos = elms[0].pos_middle_1d;}
    if(pos > elms[l - 1].pos_middle_1d && !elms[l - 1].neighbours[1]) {pos = elms[l - 1].pos_middle_1d;}
    // try to work out where this pos sits in terms of element 1d positions (i.e. which two elements is it between?)
    let ip = ["",""];
    for (let j = 0; j < l; j++) {
      if (pos > elms[j].pos_middle_1d) {
        ip[0] = elms[j];
      } else if (pos < elms[j].pos_middle_1d) {
        ip[1] = elms[j];
        break;
      } else {
        ip = [elms[j], elms[j]];
        break;
      }
    }

    // work out pos as a percentage of distance between two nearest elms
    let frac = 0;
    if(ip[1] != ip[0]){
      frac = (pos - ip[0].pos_middle_1d)/(ip[1].pos_middle_1d - ip[0].pos_middle_1d);
    }
    let new_rho = ip[0].rho + frac*(ip[1].rho - ip[0].rho);
    new_densities.push(new_rho);

  }
  return new_densities;
}


let elm_container = document.getElementsByClassName('elm_container')[0];

//create a list of elements
let elm_list = [];

for(let i = 0, l = 10; i < l; i++) {
  let elm = {
    pos_start: {x: 0, z: 0},
    pos_end: {x: 0, z: 0},
    pos_middle: {x: 0, z: 0},
    angle: (0)*Math.PI, //radians, vertically above horizontal
    diameter: 0.064, // m
    elm_length: 0.1, // m
    pressure: PR_W, //Pa
    type: 'simple',

    neighbours: ["",""],
    momentum: 0,
    velocity: 0, //ms^-1
    outflows: ["",""],
    inflows: ["",""],
  }

  elm_list.push(elm);


  if(i == 0) {
    elm.pos_start_1d = 0;
  } else {
    elm.pos_start_1d = elm_list[i-1].pos_end_1d;
  }
  elm.pos_middle_1d = elm.pos_start_1d + 0.5*elm.elm_length;
  elm.pos_end_1d = elm.pos_start_1d + elm.elm_length;

  if (i >= l/2) {
    elm.angle *= -1;
  }

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


elm_list[0].pressure = 2*PR_W;
elm_list[0].rho = newDensityFromPressure(elm_list[0].pressure, PR_W, RHO_W, K_W);
elm_list[0].mass = findElementMass(elm_list[0]);

middle_elm.diameter = RESTRICTION_DIAMETER;
middle_elm.area = findElementCrossSectionalArea(middle_elm);
middle_elm.volume = findElementVolume(middle_elm);
middle_elm.mass = findElementMass(middle_elm);
middle_elm.rho = middle_elm.mass/middle_elm.volume;
middle_elm.velocity = 0;

//////////////////////



function visualise() {
  for (let p = 0, l = INTERVALS; p < l; p++){
     for (let i = 0, l = elm_list.length; i < l; i++) {

      let elm = elm_list[i];

      let force_p = calculatePressureForce(elm);
      let force_g = calculateGravForce(elm);
      let force_f = calculateFrictionForce(elm);

      // let forces_g = [0,0];

        elm.momentum += (force_p + force_g)*TIME_STEP;

        let momentum_old = elm.momentum;


        elm.momentum += (force_f)*TIME_STEP;
        //elm.momentum[j] = elm.momentum[j]*Math.pow(1 - forces_f[j], TIME_STEP);
        if (elm.momentum/momentum_old < 0) {elm.momentum = 0;}

        elm.velocity = elm.momentum/(elm.mass);
        if (elm.velocity > VELOCITY_LIMIT || elm.velocity < -1*VELOCITY_LIMIT) {
          elm.velocity = Math.sign(elm.velocity)*VELOCITY_LIMIT;
          elm.momentum = elm.velocity*(elm.mass);
        }

    }

    // for (let i = 0, l = elm_list.length; i < l; i++) {
    //   let elm = elm_list[i];
    //   packageOutflows(elm);
    // }



    // for (let i = 0, l = elm_list.length; i < l; i++) {
    //   let elm = elm_list[i];
    //   checkMassFlows(elm);
    // }

    // for (let i = 0, l = elm_list.length; i < l; i++) {
    //   let elm = elm_list[i];
    //
    //   resolveMassFlows(elm);
    // }

    // recalculate densities, pressures, ready for the next cycle!
    let new_rhos = diffuse(elm_list);

    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];
      elm.rho = new_rhos[i];
      //elm.pressure = newPressureFromDensity(elm.rho, RHO_W, PR_W, K_W);
    }

    new_rhos = advect(elm_list);

    for (let i = 0, l = elm_list.length; i < l; i++) {
      let elm = elm_list[i];
      elm.rho = new_rhos[i];
      //elm.pressure = newPressureFromDensity(elm.rho, RHO_W, PR_W, K_W);
    }
}
  for (let i = 0, l = elm_list.length; i < l; i++) {
    let elm = elm_list[i];
    elm_div_opac(elm, elm_divs[i]);
    elm_divs[i].style.height = 100*elm.diameter/0.064 + '%';
    elm_divs[i].innerHTML =  Math.floor(elm.pressure)/1000 + 'kPa';
  }

   requestAnimationFrame (visualise);
}

// let viewport = document.getElementsByClassName('viewport')[0];
// viewport.addEventListener('click', visualise);

visualise();
