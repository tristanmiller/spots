function Interface (elements, sub, vel) {
  this.elements = elements;
  this.elements_0 = elements;
  for (let i = 0, l = this.elements.length; i < l; i++) {
    elements[i].interfaces.push(this);
  }
  this.ends = [];
  this.velocity = 0;
  if(vel) {this.velocity = vel;}
  this.massFlow = 0;
  this.depth = 0;
  this.history = [];
  if(sub) {
    this.sub = sub;
  } else {this.sub = false;}

  this.fresh = false;
  this.active = true;
  this.determineEnds();
  if(sub) {
    //TODO: replace this with 'reallocation'
    g_subInterfaces.push(this);
  } else {
  g_interfaces.push(this);
  }
  //console.log(g_interfaces.length);
}

Interface.prototype.disconnect = function () {
  //go to each element on this Interface, find its Interfaces, remove THIS Interface
  for (let i = 0, l = this.elements.length; i < l; i++) {
    let elm = this.elements[i];
    for (let j = 0, n = elm.interfaces.length; j < n; j++) {
      let iface = elm.interfaces[j];
      if(iface == this) {
        if(n > 1) {
          //console.log(n);
          elm.interfaces.splice(j,1);
        } else {
          elm.interfaces = [];
        }
        break;
      }
    }
  }
  //deactivate this Interface
  this.active = false;
}

Interface.prototype.determineEnds = function () {
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];

  let forwardDistance = calculateDistance(elm1.pos_end, elm2.pos_start); //the Pythagorean distance between elm1's end, and elm2's start
  let backwardDistance = calculateDistance(elm2.pos_end, elm1.pos_start); //the Pythagorean distance between elm2's end, and elm1's start

  if (forwardDistance > backwardDistance) {//then elm2's end is connected to elm1's start
    this.ends = ['start', 'end'];
  } else {
    // take elm1's end to be connected to elm2's start
    this.ends = ['end', 'start'];
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
      this.move();
    } else {
      //mark for subdivision (place on subdiv list) to be handled at end of cycle
      this.subdivide();
      //create subelement and sub interface
      //rejig interfaces and element boundaries to suit.
    }
  }
}

Interface.prototype.move = function () {
  let elm1 = this.elements[0];
  let elm2 = this.elements[1];


  let elm_grow = elm1;
  let elm_shrink = elm2;
  let adjust = this.ends[1];

  if (this.massFlow < 0) { elm_grow = elm2; elm_shrink = elm1; adjust = this.ends[0];}

  let mass = Math.abs(this.massFlow);
  let rho = Math.max(elm_grow.rho, elm_shrink.rho);
  let vol_disp = mass/elm_grow.rho;
  let length_disp = vol_disp/elm_shrink.elm_length;

  // length_disp is distance the interface will be moved
  // constrain this to the length of the elm_shrink

  length_disp = Math.min(length_disp, elm_shrink.elm_length);

  if (elm_shrink.elm_length - length_disp < MULTIPHASE_MIN_LENGTH) {
    length_disp = elm_shrink.elm_length;
    elm_shrink.elm_length = 0;
    elm_grow.elm_length = elm_shrink.elm_length_0;
  } else {
      elm_grow.elm_length += length_disp;
      elm_shrink.elm_length -= length_disp;
  }


  if(elm_shrink.elm_length > MULTIPHASE_MIN_LENGTH) {
    //keep adjusting the interphase boundary as normal
  } else {
    //snap the shrunken element out of existence
    console.log('getting rid of shrinky');
    //do the thing that removes the shrinky element
    //find the relevant interfaces and stitch them into the victorious element


    // get the interface on elm_shrink that isn't THIS interface
    // get the element on intA that isn't elm_shrink
    let shrink_interfaces = elm_shrink.interfaces;
    console.log(shrink_interfaces);
    let intA = shrink_interfaces[0];

    for (let i = 0, l = shrink_interfaces.length; i < l; i++) {
      let iface = shrink_interfaces[i];
      if (iface != this) {
        intA = iface;
        break;
      }
    }

    let elm = intA.elements[0];

    for (let i = 0, l = intA.elements.length; i < l; i++) {
      if(intA.elements[i] != elm_shrink) {
          elm = intA.elements[i];
          break;
      }
    }

    //disconnect both interfaces around elm_shrink
    //disable elm_shrink
    intA.disconnect();
    this.disconnect();
    elm_shrink.active = false;

    let avgVel = 0.5*(intA.velocity + this.velocity);
    //connect elm_grow with elm (creating a new Interface)
    //confer intA's 'sub' status to this new interface, and give it the avg vel of the two it replaces.
    connectElements(elm_grow, elm, intA.sub, avgVel);

  }
  elm_grow.fill(elm_grow.fluid, elm_grow.pressure);



  if(adjust == 'start') {
    //increase elm_grow's length, find new pos_end
    elm_grow.pos_end = elm_grow.findPosEnd();
    elm_grow.pos_middle = elm_grow.findPosMiddle();
    //decrease elm_shrink's length, set elm_shrink's pos_start to elm_grow's pos_end
    elm_shrink.pos_start = elm_grow.pos_end;
    elm_shrink.pos_middle = elm_shrink.findPosMiddle();
  } else if (adjust == 'end') {
    //decrease elm_shrink's length, find new pos_end
    elm_shrink.pos_end = elm_shrink.findPosEnd();
    elm_shrink.pos_middle = elm_shrink.findPosMiddle();
    //increase elm_shrink's length, set elm_grow's pos_start to elm_shrink's pos_end
    elm_grow.pos_start = elm_shrink.pos_end;
    elm_grow.pos_middle = elm_grow.findPosMiddle();
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
  let adjust = this.ends[1];

  if (this.massFlow < 0) { elm_push = elm2; elm_split = elm1; adjust = this.ends[0]; }
  if(elm_split.type != 'sink') {
    let mass = Math.abs(this.massFlow);
    let rho = Math.max(elm_push.rho, elm_split.rho);
    let vol_disp = mass/rho;
    let length_disp = vol_disp/elm_split.elm_length;

    //length_disp is the length of the new element that will be created
    length_disp = MULTIPHASE_MIN_LENGTH;
    // OR always just project into elm_split the MULTIPHASE_MIN_LENGTH?
    elm_split.elm_length -= length_disp;
    let subElement = new Element(elm_split.diameter, length_disp, elm_split.angle, elm_split.pos_start);

    if (adjust == 'start') {
      // create new (sub)element at elm_split's pos_start
      // adjust elm_split's pos_start to subElement's pos_end
      elm_split.pos_start = subElement.pos_end;
      elm_split.pos_middle =  elm_split.findPosMiddle();

    } else if (adjust == 'end') {
      // calculate new end position for elm_split
      elm_split.pos_end = elm_split.findPosEnd();
      elm_split.pos_middle = elm_split.findPosMiddle();
      // create new sub(element) at elm_split's end position
      subElement.pos_start = elm_split.pos_end;
      subElement.pos_end = subElement.findPosEnd();
      subElement.pos_middle = subElement.findPosMiddle();
    }
    subElement.createDiv();
    // fill subElement with the elm_push's fluid
    subElement.fill(elm_push.fluid, elm_push.pressure);
    elm_split.fill(elm_split.fluid, elm_split.pressure);

    //go to the interface that's on the other side of elm_split and add this interface's velocity to it
    for (let i = 0, l = elm_split.interfaces.length; i < l; i++) {
      let iface = elm_split.interfaces[i];
      if(iface != this) {
        iface.velocity += this.velocity;
      }
    }

    //unhook this interface from elm_split and elm_push;
    this.disconnect();
    console.log(this.elements);
    console.log(elm_push.interfaces);
    console.log(elm_split.interfaces);
    // create a subInterface between subElement and elm_split
    connectElements(elm_push, subElement, false);//, this.velocity);

    // console.log(elm_split);
    connectElements(subElement, elm_split, true);//, this.velocity);
    //store original 'elements' list in history of THIS interface
    // this.history.push(this.elements);

  } else if (elm_split.type == 'sink') {
    elm_push.mass -= this.massFlow;
  }
}
