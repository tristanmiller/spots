// Simple fluid physics model for SPOTS
//// Calculate net force on an element of fluid
//// Accelerate the fluid
//// Calculate mass flows
//// Update element contents
//// Calculate pressures

//// use a 2d momentum or velocity model
//// shouldn't require too much pythagorising as we can work in each dimension separately
//// this is purely to allow the net force on the fluid in an element to be calculated consistently.
//// direction changes are handled at JUNCTIONS which simply convert directions, without themselves storing fluid

//// elevation also included in model to allow for gravitational gradients

//// also we can include air in the model - it can creep into an element from neighbouring elements, creating sub-elements as it does
//// normally each type of fluid will block each other but there's a tuneable threshold for pass-through e.g. if the right conditions are met, fluids can flow past each other (bubbling)


//CALCULATIONS

/// Momentum

//// dp_hydraulic = (1D vector sum of pressure-derived forces)*dt
//// dp_grav = -dt*mg*dHeight)/(length of pipe element)
//// dp_friction = -dt*v^2*(length of pipe element)/(diameter of pipe element)

//// dp = dp_hydraulic + dp_grav + dp_friction
//// p = p + dp

/// Mass flow

// m_out = v*A*dt*rho
//  m_in = whatever is calculated from neighbouring elements

// P = some function of density
