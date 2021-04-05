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
}
