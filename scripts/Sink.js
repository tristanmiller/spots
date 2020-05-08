function Sink (diameter, pipe_length, angle, pos_start, pressure, fluid) {
  Element.call(this, diameter, pipe_length, angle, pos_start);
  this.pressure = pressure;
  this.default_pressure = pressure;
  this.fill(fluid, pressure);
  this.type = 'sink';
}

Sink.prototype = Object.create(Element.prototype);

Sink.prototype.update = function () {
  this.fill(this.fluid, this.default_pressure);
  this.flows = [];
  this.velocity = 0;
  if(this.interfaces.length > 0) {
    for (let i = 0, l = this.interfaces.length; i < l; i++) {
      let iface = this.interfaces[i];
      let mid = iface.ends[0];
      if(mid == 'end'){
        this.velocity += iface.velocity;
      } else if(mid == 'start') {
        this.velocity -= iface.velocity;
      }
    }
    this.velocity = this.velocity/this.interfaces.length;
  }
}
