let P_diff = function (dp) {
  this.terminals = {
    low: {p: 0, q: 0, height: 0, idx: 0},
    high: {p: 0, q: 0, height: 0, idx: 1},
  };

  this.states = {
    default:[
      [0, 0, -1, 1, dp]
    ]
  };
}
