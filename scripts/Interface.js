function Interface (elements) {
  this.elements = elements;
  this.elements_0 = elements;
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
  //unless we are dealing with an air/water interface? in any case, use the heavier of the two
  //also, do we need to consider buoyancy? Or will this naturally arise via the model?
  if (elm1.fluid.RHO != elm2.fluid.RHO) {
    if (elm1.fluid.RHO > elm2.fluid.RHO) {
      mass = elm1.mass;
    } else {
      mass = elm2.mass;
    }
  }


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
  // this step needs to change to incorporate the inter-fluid boundary
  if(elm1.fluid == elm2.fluid) {
    elm1.mass -= this.massFlow;
    elm2.mass += this.massFlow;
  } else {
    //determine direciton of flow - if negative, it's towards elm1
    let elm_grow = elm1, elm_shrink = elm2;
    if(this.massFlow < 0) {elm_grow = elm2; elm_shrink = elm1;}
    let mass = Math.abs(this.massFlow);
    //work out volume displaced by elm_grow's fluid
    let vol_disp = mass/elm_grow.rho;
    //work out length displaced
    let length_disp = vol_disp/elm_shrink.area;
    //change dimensions (elm_length, pos_start, pos_end, pos_mid, redo volumes etc) of both elements connected to interface
    //don't do any of this under the following conditions
    //if flow is positive and elm2 is a sink and the sink is at its original dimensions...
    //if flow is negative and elm1 is a sink and the sink is at its original dimensions...
    if(this.massFlow >= 0 && elm2.type == 'sink' && elm2.elm_length <= elm2.elm_length_0){
      elm1.mass -= this.massFlow;
    } else if(this.massFlow < 0 && elm1.type == 'sink' && elm1.elm_length <= elm1.elm_length_0){
      elm2.mass += this.massFlow;
    } else {


      elm_grow.elm_length += length_disp;
      elm_shrink.elm_length -= length_disp;
      if(elm_shrink.elm_length < 0) {
        elm_shrink.elm_length = elm_shrink.elm_length_0;
        elm_grow.elm_length = elm_grow.elm_length_0;
        elm_shrink.pos_start = elm_shrink.pos_start_0;
        elm_shrink.pos_end = elm_shrink.pos_end_0;
        elm_shrink.pos_middle = elm_shrink.pos_middle_0;
        elm_grow.pos_start = elm_grow.pos_start_0;
        elm_grow.pos_end = elm_grow.pos_end_0;
        elm_grow.pos_middle = elm_grow.pos_middle_0;
        elm_shrink.volume = elm_shrink.findVolume();
        elm_grow.volume = elm_grow.findVolume();
        elm_shrink.fill(elm_grow.fluid, elm_grow.pressure);
        elm_grow.fill(elm_grow.fluid, elm_grow.pressure);
      } else {
      if(this.massFlow > 0) {
        elm_grow.pos_end = elm_grow.findPosEnd();
        elm_grow.pos_middle = elm_grow.findPosMiddle();
        elm_shrink.pos_start = elm_grow.pos_end;
        elm_shrink.pos_middle = elm_shrink.findPosMiddle();
        elm_shrink.volume = elm_shrink.findVolume();
        elm_grow.volume = elm_grow.findVolume();
      } else {
        elm_shrink.pos_end = elm_shrink.findPosEnd();
        elm_shrink.pos_middle = elm_shrink.findPosMiddle();
        elm_grow.pos_start = elm_shrink.pos_end;
        elm_grow.pos_middle = elm_grow.findPosMiddle();
        elm_shrink.volume = elm_shrink.findVolume();
        elm_grow.volume = elm_grow.findVolume();
      }
    }
  }
    //if the direction of flow is positive
    //record how far the element has changed from its original length
    //determine new velocity for the interface by interpolating between current vel and next interface vel
  }
}
