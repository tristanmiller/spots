function Element(diameter, length, angle, pos_start){
  this.diameter = diameter;
  this.elm_length = length;
  this.area = this.findArea();
  this.volume = this.findVolume();
  this.angle = angle;
  this.directionSine = Math.sin(this.angle);
  this.directionCosine = Math.cos(this.angle);
  this.velocity = 0;
  this.pos_start = pos_start;
  this.pos_end = this.findPosEnd();
  this.pos_middle = this.findPosMiddle();
  this.pos_start_0 = pos_start;
  this.pos_end_0 = this.pos_end;
  this.elm_length_0 = length;
  this.pos = {start: this.pos_start, middle: this.pos_middle, end: this.pos_end};
  this.pos_0 = this.pos;
  this.type =  'simple';
  this.interfaces = [];
  this.neighbours = {
    up: [],
    down: [],
  };
  this.flows = [];
  g_elements.push(this);
}

Element.prototype.findArea = function () {
  let area = Math.PI*(0.5*Math.pow(this.diameter, 2));
  return area;
};

Element.prototype.findVolume = function () {
  let area = this.findArea();
  let volume = area*this.elm_length;
  return volume;
};

Element.prototype.findPosEnd = function () {
  let endX = this.pos_start.x + this.elm_length*this.directionCosine;
  let endZ = this.pos_start.z + this.elm_length*this.directionSine;
  let pos_end = {x: endX, z: endZ};
  return pos_end;
};

Element.prototype.findPosMiddle = function () {
  let midX = (this.pos_start.x + this.pos_end.x)/2;
  let midZ = (this.pos_start.z + this.pos_end.z)/2;
  let pos_mid = {x: midX, z: midZ};
  return pos_mid;
};

Element.prototype.findPosStart = function () {
  let startX = this.pos_end.x - this.elm_length*this.directionCosine;
  let startZ = this.pos_end.z - this.elm_length*this.directionSine;
  let pos_start = {x: startX, z: startZ};
  return pos_start;
};

Element.prototype.newDensityFromPressure = function (pr_ref, rho_ref, K) {
  // let rho_new = rho_ref/(1 - (pr - pr_ref)/K);
  let rho_new = rho_ref*(1 + (this.pressure - pr_ref)/K);
  this.rho = rho_new;
}

Element.prototype.newPressureFromDensity = function (pr_ref, rho_ref, K) {
  // let pr_new = K*Math.log(rho/rho_ref);
  let pr_new = pr_ref + K*(this.rho - rho_ref)/rho_ref;
  this.pressure = pr_new;
}

Element.prototype.findMass = function () {
  let volume = this.findVolume();
  let mass = this.rho*volume;
  this.mass = mass;
}

Element.prototype.findDensity = function () {
  if (this.mass > 0 && this.volume > 0) {
    this.rho = this.mass/this.volume;
  }
}

Element.prototype.calculatePressureForce = function () {
  if(this.neighbours.down.length > 0) {
    let F_this = this.pressure*this.area;
    for (let i = 0, l = this.neighbours.down.length; i < l; i++) {
      let neighbour = this.neighbours.down[i];
      let area_min = Math.min(this.area, neighbour.area);
      F_this -= neighbour.pressure*area_min;
      let F_down = this.pressure*area_min - neighbour.pressure*neighbour.area;
      neighbour.velocity += TIME_SUBSTEP*(F_down/neighbour.mass);
    }
    this.velocity += TIME_SUBSTEP*(F_this/this.mass);
  }
}

Element.prototype.calculateGravForce = function () {
  let F_this = this.mass*GRAV_ACCN*this.directionSine;
  this.velocity += TIME_SUBSTEP*(F_this/this.mass);
}

Element.prototype.calculateFrictionForce = function () {
  this.velocity = this.velocity*Math.pow(0.9, 1/INTERVALS);
}

Element.prototype.convertVelocityToFlows = function () {
  if (this.velocity !== 0) {
    let dirn = 'down';
    if (this.velocity < 0) {
      dirn = 'up';
    }
    //idea - advect the velocity as well?
    let totalFlow = Math.abs(this.rho*this.velocity*this.area*TIME_SUBSTEP);
    let neighbours = this.neighbours[dirn];
    let interArea = 0;
    for(let i = 0, l = neighbours.length; i < l; i++) {
      interArea += Math.min(neighbours[i].area, this.area);
    }
    for(let i = 0, l = neighbours.length; i < l; i++) {
      let thisFraction = Math.min(this.area, neighbours[i].area)/interArea;
      this.flows.push([-1*thisFraction*totalFlow, neighbours[i]]);
      // console.log(this.flows);
    }
  }
}

//the following is used to update the density, then the pressure of an element
//when the mass and/or volume has changed
Element.prototype.update = function () {
  this.area = this.findArea()
  this.volume = this.findVolume();
  this.findDensity();
  this.newPressureFromDensity(this.fluid.PR, this.fluid.RHO, this.fluid.K);
  this.findMass();
  // this.flows = [];
}

Element.prototype.fill = function (fluid, pressure) {
  this.fluid = fluid;
  if (pressure) {this.pressure = pressure;} else {this.pressure = this.fluid.PR;}
  this.newDensityFromPressure(this.fluid.PR, this.fluid.RHO, this.fluid.K);
  this.findMass();
}

Element.prototype.checkMassFlows = function () {

  // if there is too little density remaining in the element due to mass outflows, scale the outbound mass flow

}

Element.prototype.diffuse = function () {
  // diffuse element density into neighbours. Make the diffusion disproportionately aggressive for density gradients above a certain
  // threshold


  //diffusion total amount should depend on the interfaced area of the element, the diffusion constant (i.e. what percentage
  // of this quantity should be diffused in each time step), any modifiers for being above a certain density

  //store in flows for each element, then apply those flows.
  //do one-sided (outwards) for each element

  let interArea = 0;
  for (let i = 0, l = this.neighbours.up.length; i < l; i++) {
    let neighbour = this.neighbours.up[i];
    interArea += neighbour.area;
  }
  for (let i = 0, l = this.neighbours.down.length; i < l; i++) {
    let neighbour = this.neighbours.down[i];
    interArea += Math.min(neighbour.area, this.area);
  }

  //consider making an 'all neighbours' list from the two, for ease of dealins and to lose repetition
  //this should also be based on density or pressure, rather than mass.
  for (let i = 0, l = this.neighbours.up.length; i < l; i++) {
    let neighbour = this.neighbours.up[i];
    let thisFlow = this.mass*DIFFUSION_CONSTANT*TIME_SUBSTEP;
    this.flows.push([-1*thisFlow, neighbour]);
  }
  for (let i = 0, l = this.neighbours.down.length; i < l; i++) {
    let neighbour = this.neighbours.down[i];
    let thisFlow = this.mass*DIFFUSION_CONSTANT*TIME_SUBSTEP;
    this.flows.push([-1*thisFlow, neighbour]);
  }
}




Element.prototype.applyFlows = function () {
  for (let i = 0, l = this.flows.length; i < l; i++) {
    this.mass += this.flows[i][0];
    this.flows[i][1].mass -= this.flows[i][0];
  }

  this.flows = [];

}
