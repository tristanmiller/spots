let Pipe = function(diam, length, rho = 997, p_fill = 100000) {
  this.diam = diam;
  this.area = Math.PI*Math.pow(0.5*diam, 2);
  this.length = length;
  this.volume = this.length*this.area;
  this.mass = this.volume*rho;
  this.res = this.poiseuille();
  this.dq = 0;

  this.terminals = {
      in: {p: p_fill, q: 0, height: 0, idx:0},
      out: {p: p_fill, q: 0, height: 0, idx: 1},
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

Pipe.prototype.update = function(time_step = 1/60)  {
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
  this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq/this.area];
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
