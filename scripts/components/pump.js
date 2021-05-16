let Pump = function (diam, length, d_impeller, rho = 997, g = 9.81) {
  Pipe.call(this, diam, length, rho);

  this.revs = 0;
  this.d_impeller = d_impeller;
  this.dp = 0;

  this.states = {
      default:[
        [this.res, 0, -1, 1, this.dp - (this.mass*this.dq/this.area)]
      ],
      cav: [
        [0, 0, -1, 1, 0]
      ],
    };
    this.state = 'default';
}

Pump.prototype = Object.create(Pipe.prototype);

Pump.prototype.update = function(rho = 997, g = 9.81) {
  let q_prev = 0;
  if (this.terminals.in.history) {
    if (this.terminals.in.history[0]) {
      q_prev = this.terminals.in.history[0].q;
    }
  }
  this.dp = 0.00014*g*rho*Math.pow(this.d_impeller*this.revs,2) - 0.5*rho*Math.pow((1/60000)*q_prev/this.area,2); //this one assumes q_prev in LPM
  if (this.terminals.in.p < 3000) {
    // this.revs *= 0.9;
    let d = new Date();
    let n = d.getMilliseconds();
    this.dp = this.dp*Math.sin(2*Math.PI*n/1000);
    if (this.terminals.in.p - this.dp < 0) {
      this.dp = 0;
    }

  }
  this.states.default[0] = [this.res, 0, -1, 1, this.dp - (this.mass*this.dq/this.area)];
}
