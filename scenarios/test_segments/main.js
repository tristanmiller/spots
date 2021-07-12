
let map_p5 = function (value, oldMin, oldMax, newMin, newMax) {
  let prop = (value - oldMin)/(oldMax - oldMin);
  let newVal = prop*(newMax - newMin) + newMin;
  return newVal;
}



let tank = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx:0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  height: 1.5,
  cap: 3000,
  stored: 3000,

  states: {
    default:[
      [0, 0, -1, 1, 1.5*997*9.81]
    ]
  },

  update: function(time_step = 1/60) {
    let outflow = this.terminals.out.q*time_step;
    this.stored += outflow;
    this.height = this.stored/2000;
    this.states.default[0] = [0,0,-1,1, this.height*997*9.81];
    // console.log(this.stored);
  }

}

let Tank2 = function () {
  this.terminals = {
    value: {p: 0, q: 0, height: 0, idx: 0, device: this},
  };
  this.height = 1.5;
  this.cap = 3000;
  this.stored = 3000;
  this.states = {
    default:[
      [0, 1, 100000 + this.height*997*9.81]
    ],
    empty:[
      [1, 0, 0]
    ]
  };
  this.update = function(time_step = 1/60) {
    let outflow = this.terminals.value.q*time_step;
    this.stored += outflow*1000;
    if(this.stored <= 0) {
      this.stored = 0;
      this.state = 'empty';
    } else {
      this.state = 'default';
    }
    this.height = this.stored/2000;
    this.states.default[0] = [0, 1, 100000 + this.height*997*9.81];
    // console.log(this.stored);
  }

}




let branch = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx: 0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  target: 750000,
  tol: 10000,
  res_default: 100000000,
  q_min: 280/60000,
  q_max: 800/60000,
  res: 100000000,
  mass: 0,
  dq: 0,
  open: 1,

  states: {
    default:[
      [100000000, 0, -1, 1, 0]
    ],
    off: [
      [1, 0, 0, 0, 0]
    ],
  },

  update: function(time_step = 1/60) {
    if(this.open > 0) {
      this.state = 'default';
      let q_prev = 0;
      let q_prev_prev = 0;
      let dp_prev = 0;
      let term = this.terminals.in;
      if (term.history) {
        if (term.history[0]) {
          q_prev = term.history[0].q;
        }
        if (term.history[1]) {
          q_prev_prev = term.history[1].q;
        }
      }
      if (term.q > this.q_min && term.q < this.q_max) {
        let dp = this.terminals.in.p - this.terminals.out.p;
        if (dp > this.target + this.tol) {
          this.res *= 0.99;
        } else if (dp < this.target - this.tol) {
          this.res *= 1.01;
        }
      }
      this.dq = (q_prev - q_prev_prev)/time_step;
      this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq];
    } else {
      // this.state = 'off';
    }
  }
}

let pipe1a = new Pipe(0.150, 10);
let pipe1b = new Pipe(0.150, 10);
let pipe1c = new Pipe(0.150, 10);
let pipe2a = new Pipe(0.064, 15);
let pipe2b = new Pipe(0.064, 15);
let pipe3a = new Pipe(0.025, 30);
let pipe3b = new Pipe(0.025, 30);


let atmo = new P_value(100000);
let mains = new P_value(600000);



let thisNet = new Network;
// thisNet.add_device(mains);
// thisNet.add_device(atmo);
thisNet.add_device(pipe1a);
thisNet.add_device(pipe1b);
thisNet.add_device(pipe1c);
thisNet.add_device(pipe2a);
thisNet.add_device(pipe2b);
thisNet.add_device(pipe3a);
thisNet.add_device(pipe3b);


// thisNet.create_link(mains.terminals.value, pipe1a.terminals.in);
// thisNet.create_link(mains.terminals.value, pipe2a.terminals.in);
// thisNet.create_link(mains.terminals.value, pipe3a.terminals.in);
//
// thisNet.create_link(pipe1c.terminals.out, atmo.terminals.value);
// thisNet.create_link(pipe2b.terminals.out, atmo.terminals.value);
// thisNet.create_link(pipe3b.terminals.out, atmo.terminals.value);


// thisNet.create_link(pipe1a.terminals.in, pipe2a.terminals.in);
// thisNet.create_link(pipe1a.terminals.in, pipe3a.terminals.in);
// thisNet.create_link(pipe1c.terminals.out, pipe2b.terminals.out);
// thisNet.create_link(pipe1c.terminals.out, pipe3b.terminals.out);


thisNet.create_link(pipe1a.terminals.in, pipe2b.terminals.out);
thisNet.create_link(pipe2a.terminals.in, pipe1c.terminals.out);


thisNet.create_link(pipe1a.terminals.out, pipe1b.terminals.in);
thisNet.create_link(pipe1b.terminals.out, pipe1c.terminals.in);

thisNet.create_link(pipe2a.terminals.out, pipe2b.terminals.in);
thisNet.create_link(pipe3a.terminals.out, pipe3b.terminals.in);



thisNet.build_nodes();
thisNet.build_matrix();

buildSegmentMap(thisNet);




console.log(thisNet);







let update = () => {
  // thisNet.build_nodes();
  thisNet.build_matrix();
  thisNet.update();




  // requestAnimationFrame(update);

}

update();
