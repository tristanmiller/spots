function Element(diameter, length, angle, pos_start){
  this.diameter = diameter;
  this.elm_length = length;
  this.area = this.findArea();
  this.volume = this.findVolume();
  this.angle = angle;
  this.directionSine = Math.sin(this.angle);
  this.directionCosine = Math.cos(this.angle);
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
  this.subdivided = false;
  this.fresh = false;
  this.parentElement = '';
  this.sub_elements = [];
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

//the following is used to update the density, then the pressure of an element
//when the mass and/or volume has changed
Element.prototype.update = function () {
  this.area = this.findArea()
  this.volume = this.findVolume();
  this.findDensity();
  this.newPressureFromDensity(this.fluid.PR, this.fluid.RHO, this.fluid.K);
  this.flows = [];
  this.fresh = false;
}

Element.prototype.fill = function (fluid, pressure) {
  this.fluid = fluid;
  if (pressure) {this.pressure = pressure;} else {this.pressure = this.fluid.PR;}
  this.newDensityFromPressure(this.fluid.PR, this.fluid.RHO, this.fluid.K);
  this.findMass();
}

Element.prototype.checkMassFlows = function () {

  //go through list of flows
  //work out if there is a net loss of mass
  //if so, work out whether it results in 'too low' density
  //if so, scale the -ve flows appropriately
  //scale the velocities on the corresponding interfaces appropriately

    let net_massFlow = 0;
    let inflows = [];
    let outflows = [];
    let outflow = 0;
    for (let i = 0, l = this.flows.length; i < l; i++) {
      let flow = this.flows[i];
      net_massFlow += flow[0];
      if (flow[0] < 0) {
        outflows.push(this.flows[i]);
        outflow += flow[0];}
      else {inflows.push(flow);}
    }

    let mass_critical = this.volume*this.fluid.RHO_Critical;

    if(this.mass + net_massFlow < mass_critical) {
      //find the outflow that will bring the mass to mass_critical
      let max_outflow = mass_critical - this.mass;
      //find a scaling factor i.e. desired/actual outflow
      let scale_factor = max_outflow/outflow;
      if(scale_factor < 0) {scale_factor = 0;} else if (scale_factor > 1) {scale_factor = 1;}
      // console.log(scale_factor);
      //scale each of the flows in the outflows list. Also scale the velocities of the corresponding interfaces
      for (let i = 0, l = this.flows.length; i < l; i++) {
        if(this.flows[i][0] < 0){
          this.flows[i][0] = this.flows[i][0]*scale_factor;
          this.flows[i][1].velocity = this.flows[i][1].velocity*scale_factor;
          this.flows[i][1].massFlow = this.flows[i][1].massFlow*scale_factor;
        }
      }
      return true;
    } else {return false;}
}

Element.prototype.updateDiv = function () {
  this.elm_div.style.top = 50*this.pos_start.z + 'px';
  this.elm_div.style.left = 50*this.pos_start.x + 'px';
  this.elm_div.style.width = 50*this.elm_length + 'px';
  this.elm_div.style.transform = 'rotateZ(' + this.angle*180/Math.PI + 'deg)';
}

Element.prototype.createDiv = function () {
  let elm_container = document.getElementsByClassName('elm_container')[0];
  this.elm_div = document.createElement('div');
  this.elm_div.className = 'elm';
  this.updateDiv();
  if(this.type == 'sink') {this.elm_div.classList.add('sink');}
  elm_container.appendChild(this.elm_div);
}
