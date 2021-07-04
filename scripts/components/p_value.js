let P_value = function (pressure) {
  this.p = pressure;
  this.terminals = {
    value: {p: 0, q: 0, height: 0, idx: 0, device: this},
  };
  this.states = {
    default:[
      [0, 1, this.p]
    ]
  };
}
