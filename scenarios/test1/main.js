


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


let pipe1 = new Pipe(0.064, 15);
let pipe2 = new Pipe(0.064, 15);




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

let valve1 = new Valve(0.064, 0.15);
let valve2 = new Valve(0.064, 0.15);

let pump = new Pump(0.150, 1.5, 0.30);

let mains0 = new P_diff(400000);

let atmo = new P_value(100000);
let mains = new P_value(600000);



let thisNet = new Network;
// thisNet.add_device(mains);
thisNet.add_device(pipe1);
thisNet.add_device(valve1);
thisNet.add_device(pump);
thisNet.add_device(valve2);
thisNet.add_device(pipe2);
thisNet.add_device(branch);
thisNet.add_device(atmo);
// thisNet.add_device(tank);
thisNet.add_device(mains);
thisNet.create_link(mains.terminals.value, pipe1.terminals.in);
// thisNet.create_link(tank.terminals.out, pipe1.terminals.in);
thisNet.create_link(pipe1.terminals.out, valve1.terminals.in);
thisNet.create_link(valve1.terminals.out, pump.terminals.in);
thisNet.create_link(pump.terminals.out, valve2.terminals.in);
thisNet.create_link(valve2.terminals.out, pipe2.terminals.in);
thisNet.create_link(pipe2.terminals.out, atmo.terminals.value);
// thisNet.create_link(branch.terminals.out, atmo.terminals.value);
// thisNet.create_link(atmo.terminals.value, mains.terminals.low);

thisNet.build_nodes();
thisNet.build_matrix();





console.log(thisNet);

let RPM_slider = document.getElementById('RPM');
let RPM_output = document.getElementById('RPM_value');
let inlet_valve_slider = document.getElementById('inlet_valve');
let inlet_valve_output = document.getElementById('inlet_valve_value');
let outlet_valve_slider = document.getElementById('outlet_valve');
let outlet_valve_output = document.getElementById('outlet_valve_value');
let P_in_display = document.getElementById('P_inlet');
let P_out_display = document.getElementById('P_outlet');
let flow_display = document.getElementById('flowrate');

RPM_output.innerHTML = RPM_slider.value;
pump.revs = RPM_slider.value;

RPM_slider.oninput = function() {
  RPM_output.innerHTML = this.value;
  pump.revs = this.value;
}

inlet_valve_output.innerHTML = inlet_valve_slider.value;
valve1.open = inlet_valve_slider.value/100;

inlet_valve_slider.oninput = function() {
  inlet_valve_output.innerHTML = `${this.value}%`;
  valve1.open = this.value/100;
}

outlet_valve_output.innerHTML = outlet_valve_slider.value;
valve2.open = outlet_valve_slider.value/100;

outlet_valve_slider.oninput = function() {
  outlet_valve_output.innerHTML = `${this.value}%`;
  valve2.open = this.value/100;
}

let pointer = document.getElementById("pointer_needle");
let pointer_main = document.getElementById("pointer_needle_main");


let update = () => {
  // thisNet.build_nodes();
  thisNet.build_matrix();
  thisNet.update();

  P_in_display.innerHTML = `${Math.round(pump.terminals.in.p/1000)} kPa`;
  if(Math.round(pump.terminals.in.p) < 100000) {
    P_in_display.style.color = `red`;
  } else {
    P_in_display.style.color = `black`;
  }
  P_out_display.innerHTML = `${Math.round(pump.terminals.out.p/1000)} kPa`;
  flow_display.innerHTML = `${Math.round(pump.terminals.in.q*60000)} LPM`;

  let pointer_angle = 0;
  let pointer_p = pump.terminals.in.p - 100000;
  let pointer_main_p = pump.terminals.out.p - 100000;
  if(pointer_p < 0) {
    //map pressure range to degrees
    pointer_angle = (pointer_p/100000)*120;
    if (pointer_angle < -140) {pointer_angle = -140};
  } else {
    pointer_angle = (pointer_p/2500000)*120;
    if (pointer_angle > 160) {pointer_angle = 160};

  }

  let pointer_main_angle = (pointer_main_p/2500000)*240 - 120;
      if (pointer_main_angle > 250) {pointer_main_angle = 250};
  pointer.style.transform = `rotateZ(${pointer_angle}deg)`;
  pointer_main.style.transform = `rotateZ(${pointer_main_angle}deg)`;

  requestAnimationFrame(update);
}

update();
