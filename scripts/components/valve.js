let Valve = function (diam, length, rho = 997) {
  Pipe.call(this, diam, length, rho);
  this.res_default = this.res;
  this.open = 0;
  this.cap = 1e-15;
  this.states = {
      default:[
        [this.res, 0, -1, 1, -1*this.mass*this.dq/this.area]
      ],
      off: [
        [1, 0, 0, 0, 0]
      ],
    };
  this.state = 'off';
}

Valve.prototype = Object.create(Pipe.prototype);

Valve.prototype.update = function(time_step = 1/60)  {
  if (this.open > 0) {
    if (this.state != 'default') {
      this.state = 'default';
    }
  } else if (this.open == 0) {
    if (this.state != 'off') {
      this.state = 'off';
    }
  }
  this.res = this.res_default/Math.pow(this.open,4);
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
  let dp_prev = 0;
  if (term.history) {
    let p_in_prev = term.history[0].p;
    let p_out_prev = this.terminals.out.history[0].p;
    dp_prev = p_in_prev - p_out_prev;
  }

  this.dq = (q_prev - q_prev_prev)/time_step;
  this.states.default[0] = [(time_step*this.res)/(this.res*this.cap + time_step), 0, -1, 1, dp_prev*(this.res*this.cap)/(this.res*this.cap + time_step) - this.mass*this.dq/this.area];
  this.states.off[0] = [1, 0, -1*this.cap/time_step, this.cap/time_step, -1*dp_prev*this.cap/time_step];



}
