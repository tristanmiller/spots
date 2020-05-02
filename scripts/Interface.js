function Interface (elements) {
  this.elements = elements;
  this.elements_0 = elements;
  for (let i = 0, l = this.elements.length; i < l; i++) {
    elements[i].interfaces.push(this);
  }
  this.velocity = 0;
  this.massFlow = 0;
  this.depth = 0;
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


Interface.prototype.calculateMassFlows = function (time_step) {
  if(!time_step) {time_step = TIME_STEP;}
  //determine forces
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];
  if(elm1.area > 0 && elm2.area > 0) {
    let force = this.calculateForce(elm1, elm2);
    let mass = 0.5*(elm1.mass + elm2.mass);
    let momentum = mass*this.velocity;
    //apply forces to combined mass
    //from updated velocity, work out how much mass to transfer from one element to another

    momentum += force*time_step;

    let fac  = FRIC_REF/this.calculateFrictionForce(elm1, elm2);
    if (fac > 1) { fac = 1; }
    // console.log(fac);
    momentum *= Math.pow((fac), FRIC_CONST*time_step);
    //replace with a factor that depends on pipe parameters, as a fraction of some 'reference pipe' at 'maximum flow speed'


    this.velocity = momentum/mass;
    if (Math.abs(this.velocity) < VELOCITY_THRESHOLD) {this.velocity = 0;}
    this.velocity = Math.round((1/VELOCITY_THRESHOLD)*this.velocity)/(1/VELOCITY_THRESHOLD);
    if (this.velocity > VELOCITY_LIMIT || this.velocity < -1*VELOCITY_LIMIT) {this.velocity = Math.sign(this.velocity)*VELOCITY_LIMIT;}
    this.massFlow = this.velocity*time_step*Math.min(elm1.area, elm2.area);
    //insert check here for excessive flow across interface
    //if there is excessive flow -
    //for loop
    // recurse but with timestep = 0.1*TIME_STEP
    //
    let tooMuch = false;
    if (this.velocity < 0) {
      this.massFlow *= elm2.rho;
      if ((elm2.mass + this.massFlow)/elm2.volume < elm2.fluid.RHO_Critical) {tooMuch = true;}
    }
    if (this.velocity > 0) {
      this.massFlow *= elm1.rho;
      if ((elm1.mass + this.massFlow)/elm1.volume < elm1.fluid.RHO_Critical ) {tooMuch = true;}
    }
    // console.log(tooMuch);
    if (tooMuch) {
      if (this.depth < RECURSION_LIMIT) {
        this.depth ++;
        for (let i = 0; i < SUB_STEPS; i++) {
          this.calculateMassFlows(time_step/SUB_STEPS);
          this.resolveMassFlows();
          elm1.update();
          elm2.update();
        }
        this.depth --;
      } else {
        // this.massFlow = this.massFlow/Math.pow(SUB_STEPS, RECURSION_LIMIT + 1);
        // this.velocity = this.velocity/Math.pow(SUB_STEPS, RECURSION_LIMIT + 1);
      }


    }



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
    if(this.velocity < 0) {elm_grow = elm2; elm_shrink = elm1;}
    let mass = Math.abs(this.massFlow);
    //work out volume displaced by elm_grow's fluid
    let vol_disp = mass/elm_grow.rho;
    //work out length displaced
    let length_disp = vol_disp/elm_shrink.area;
    //change dimensions (elm_length, pos_start, pos_end, pos_mid, redo volumes etc) of both elements connected to interface
    //if length_disp is longer than the neighbouring element
      //return the next element to its original length
      //fill this element with the correct fluid etc
      //determine a new length_disp and apply to the following following element
      //this could get way more complicated than intended...
    //don't do any of this under the following conditions
    //if flow is positive and elm2 is a sink and the sink is at its original dimensions...
    //if flow is negative and elm1 is a sink and the sink is at its original dimensions...
    if(elm_shrink.type == 'sink' && elm_shrink.elm_length <= elm_shrink.elm_length_0){
      elm_grow.mass -= mass;
    } else {
      length_disp = Math.min(length_disp, elm_shrink.elm_length);
      elm_grow.elm_length += length_disp;
      elm_shrink.elm_length -= length_disp;
      //round elm_lengths to avoid elements getting stuck with tiny, unaccelerateable masses
      //could use a particular length as a threshold, e.g. 1mm, or make it relative to the element's original length?
      if(elm_shrink.elm_length < MULTIPHASE_MIN_LENGTH) {
        elm_shrink.elm_length = 0;
      }
      if(elm_shrink.elm_length <= 0) {
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

        //take average of connected interface velocities?
        //or simply apply elm_grow's velocities to elm_shrink's?
        //PROBLEM: this assumes that the elements are connected in the positive velocity direction - careful!!!
        if (this.velocity > 0) {
          if(elm_shrink.interfaces[1]) {
            elm_shrink.interfaces[1].velocity = this.velocity;
          }
          if(elm_grow.interfaces.length > 1){
            this.velocity = (elm_grow.interfaces[0].velocity + elm_grow.interfaces[1].velocity)/2;
          } else { this.velocity = this.velocity/2;}
        } else if (this.velocity < 0) {
          if(elm_shrink.interfaces[0]) {
            elm_shrink.interfaces[0].velocity = this.velocity;
          }
          if(elm_grow.interfaces.length > 1){
            this.velocity = (elm_grow.interfaces[0].velocity + elm_grow.interfaces[1].velocity)/2;
          } else {
            this.velocity = this.velocity/2;
          }

        }


        elm_shrink.fill(elm_grow.fluid, elm_grow.pressure);
        elm_grow.fill(elm_grow.fluid, elm_grow.pressure);

      } else if (elm_shrink.elm_length > 0) {
        if(this.velocity > 0) {
          elm_grow.pos_end = elm_grow.findPosEnd();
          elm_grow.pos_middle = elm_grow.findPosMiddle();
          elm_shrink.pos_start = elm_grow.pos_end;
          elm_shrink.pos_middle = elm_shrink.findPosMiddle();
          elm_shrink.volume = elm_shrink.findVolume();
          elm_grow.volume = elm_grow.findVolume();
        } else {
          elm_grow.pos_start = elm_grow.findPosStart();
          elm_grow.pos_middle = elm_grow.findPosMiddle();
          elm_shrink.end = elm_grow.pos_start;
          elm_shrink.pos_middle = elm_shrink.findPosMiddle();
          elm_shrink.volume = elm_shrink.findVolume();
          elm_grow.volume = elm_grow.findVolume();
        }
      }
    }
  }
}
