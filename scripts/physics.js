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
