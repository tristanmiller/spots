let Pipe = function(diam, length, rho = 997, p_fill = 100000) {
  this.diam = diam;
  this.area = Math.PI*Math.pow(0.5*diam, 2);
  this.length = length;
  this.volume = this.length*this.area;
  this.mass = 0*this.volume*rho;
  this.res = this.poiseuille();
  this.res_default = this.res;
  this.dq = 0;
  this.cap = this.length*1e-10;

  this.terminals = {
      in: {p: p_fill, q: 0, height: 0, idx:0, device: this},
      out: {p: p_fill, q: 0, height: 0, idx: 1, device: this},
  };

  this.states = {
    default:[
        [this.res, 0, -1, 1, -1*this.mass*this.dq/this.area]
      ],
    static:[
        [0, 0, 1, 0, (this.terminals.in.p + this.terminals.out.p)/2]
    ]
    }
}

Pipe.prototype.poiseuille = function(radius = this.diam/2, length = this.length, visc = 8.9e-4, rho = 997) {
  let resistance = 8*visc*rho*length/(Math.PI*Math.pow(radius, 4));
  return resistance;
}

Pipe.prototype.update = function(time_step = 1/60, rho = 997, g = 9.81)  {
  let dh = this.terminals.in.height - this.terminals.out.height;
  let q_prev = 0;
  let q_prev_prev = 0;
  let term = this.terminals.in;
  if (term.history) {
    if (term.history[0]) {
      q_prev = term.history[0].q;
    }
    if (term.history[1]) {
      q_prev_prev = term.history[1].q;
    }
  }
  this.dq = (q_prev - q_prev_prev)/time_step;
  let dp_prev = 0;
  if (term.history) {
    let p_in_prev = term.history[0].p;
    let p_out_prev = this.terminals.out.history[0].p;
    dp_prev = p_in_prev - p_out_prev;
  }

  //need to add a state to represent a collapsed hose, e.g. if internal pressure < atmospheric
  //in this state, the hose acts like a closing valve - resistance goes up, delta p increases
  //but when a certain delta p is achieved, the hose suddenly reinflates until this surge dissipates
  //then back to the condition that began the problem.
  // if (term.p < 100000 || this.terminals.out.p < 100000) {
  //   if(this.res < 100*this.res_default) {
  //     this.res = this.res * 1.01;
  //   } else {
  //     this.res = this.res * 0.90;
  //     if (this.res < this.res_default) {this.res = this.res_default;}
  //   }
  // } else {
  //   this.res = this.res_default;
  // }
  // this.states.default[0] = [(time_step*this.res)/(this.res*this.cap + time_step), 0, -1, 1, dp_prev*(this.res*this.cap)/(this.res*this.cap + time_step) - this.mass*this.dq/this.area];
  this.states.default[0] = [this.res, 0, -1, 1, dp_prev*(this.res*this.cap)/(this.res*this.cap + time_step) - this.mass*this.dq/this.area + rho*g*dh];
  this.states.static[0] = [0, 0, -1, 1, (this.terminals.in.history[0].p + this.terminals.out.history[0].p)];
  // if(term.q == 0) {
  //   if(this.state != 'static') {
  //     this.state = 'static';
  //   }
  // } else {
  //   if (this.state != 'default') {
  //     this.state = 'default';
  //   }
  // }
}
