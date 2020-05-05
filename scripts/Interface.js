function Interface (elements, sub) {
  this.elements = elements;
  this.elements_0 = elements;
  for (let i = 0, l = this.elements.length; i < l; i++) {
    elements[i].interfaces.push(this);
  }
  this.ends = [];
  this.velocity = 0;
  this.massFlow = 0;
  this.depth = 0;
  this.history = [];
  this.sub = sub;
  this.fresh = false;
  this.active = true;
  if(sub) {
    //TODO: replace this with 'reallocation'
    g_subInterfaces.push(this);
  } else {
  g_interfaces.push(this);
  }
  console.log(g_interfaces.length);
}

Interface.prototype.determineEnds = function () {
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];

  let forwardDistance = calculateDistance(elm1.pos_end, elm2.pos_start); //the Pythagorean distance between elm1's end, and elm2's start
  let backwardDistance = calculateDistance(elm2.pos_end, elm1.pos_start); //the Pythagorean distance between elm2's end, and elm1's start

  if (forwardDistance > backwardDistance) {//then elm2's end is connected to elm1's start
    this.ends = [elm1.pos_start, elm2.pos_end];
  } else {
    // take elm1's end to be connected to elm2's start
    this.ends = [elm1.pos_end, elm2.pos_start];

  }

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

  //do update process for sub-interfaces before regular interfaces
  //do creation of sub-interfaces and elements after regular interfaces

  if(elm1.fluid == elm2.fluid) {
    if(this.sub) {
      //do subinterface thing (in this case, merge the elements across the interface)
      //delete/deactivate the interface and hook up the merged element to the correct interfaces
    } else {
      //move mass from one element to the other
      elm1.mass -= this.massFlow;
      elm2.mass += this.massFlow;
    }

  } else if (elm1.fluid != elm2.fluid) {
    if (this.sub) {
      //do subinterface thing (in this case, shift position of fluid boundary)
      //collapse elements as necessary, deactivate and restore interfaces
    } else {
      //mark for subdivision (place on subdiv list) to be handled at end of cycle
      //create subelement and sub interface
      //rejig interfaces and element boundaries to suit.
    }
  }
}

Interface.prototype.subdivide = function () {
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];

  //a positive massflow or velocity means towards element 1
  //a negative massflow or velocity means towards element 0
  //so we know which one to subdivide
  let elm_push = elm1;
  let elm_split = elm2;
  if (this.massFlow < 0) { elm_push = elm2; elm_split = elm1;}

  let mass = Math.abs(this.massFlow);
  //just don't know which end of the subdivided element to move
  //how to figure this out?
  //determine an approximate 'location' for the interface: compare start&end position pairs for the two elements
  
  //assign this interfaces's velocity to the sub-interface

}
