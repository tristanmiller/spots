//try to do g-j elimination on an augmented matrix

//This function takes the matrix to be 'solved' as an argument, and outputs a list of solutions (or fails gracefully and reports the error)

let gje = (M) => {
  //implement some checks here. Matrix should be n + 1 columns with n rows, for instance. For now, assume well-formed input M
  for (let col = 0, l = M[0].length - 1; col < l; col++) {
    // console.log(`now working on col ${col}`);
    //reorder rows, in descending order of value in the current column
    for (let row = col, m = M.length; row < m; row++) {
      // console.log(`now working on row ${row}`);
      if (M[row][col] == 0) {
        //do nothing. go to next row
        // console.log('zero here, going to next row');
      } else {
        //check to see if this row can be promoted
        //if there are any rows above...
        if (M[row - 1]) {
          let temp_row = row;
          // console.log(`temp_row initialised at ${temp_row}`);
          while (M[temp_row - 1] && temp_row - 1 >= col) {
            // console.log(`temp_row is ${temp_row}`);
            if (M[temp_row - 1][col] == 0 || M[temp_row - 1][col] < M[temp_row][col]) {
              //promote row - swap with the row above.
              // console.log('promoting');
              [M[temp_row - 1], M[temp_row]] = [M[temp_row], M[temp_row - 1]];
              //decrement temp_row
              temp_row--;
            } else {
              //do nothing - row can't be promoted any higher.
              // console.log('can not promote');
              break;
            }
          }
        }
      }
    }

    //once rows are reordered, divide each element in the colth row by the value in the current col.
    let divisor = M[col][col];
    if (divisor != 0) {
      for (let i = col;  i < l + 1; i++) {
        if (M[col][i] != 0) {
          M[col][i] = M[col][i]/divisor;
        }
      }

      //next, for each row that has a non-zero value in this column, subtract from each element the relevant multiple of the corresponding element of the colth row
      for (let row = 0, m = M.length; row < m; row++) {
        if (row != col && M[row][col] != 0) {
          let factor = M[row][col];
          for (let i = col;  i < l + 1; i++) {
            M[row][i] -= factor*M[col][i];
          }
        }
      }
    } else {
      // console.log(`Somehow we are dividing by zero. Something has gone wrong`);
    }
  }
  // console.log(M);
}

// this function takes one matrix as an argument and returns a clone
let clone_matrix = (M) => {
  let M_clone = [];
  // now go to each row of M, create a deep copy of the row and push it to M_clone
  for (let i = 0, l = M.length; i < l; i++) {
    let row = M[i];
    let row_clone = [...row];
    M_clone.push(row_clone);
  }
  return(M_clone);
}

let poiseuille = (radius, length, visc) => {
  let resistance = 8*visc*997*length/(Math.PI*Math.pow(radius, 4));
  return resistance;
}

let poiseuille2 = (diam, length, visc) => {
  let resistance = 128*visc*997*length/(Math.PI*Math.pow(diam, 4));
  return resistance;
}

console.log(poiseuille(0.032, 30, 8.9e-4));

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


let pipe1 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx:0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  res: 6800000,
  mass: 100,
  dq: 0,

  states: {
    default:[
      [6800000, 0, -1, 1, 0]
    ]
  },

  update: function(time_step = 1/60) {
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
    this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq/(Math.PI*0.032*0.032)];
  }

}

let pipe2 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx: 0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  res: 3400000,
  mass: 100,
  dq: 0,

  states: {
    default:[
      [3400000, 0, -1, 1, 0]
    ]
  },

  update: function(time_step = 1/60) {
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
    this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq/(Math.PI*0.032*0.032)];
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

let valve1 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx: 0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  open: 0,
  res_default: 100000,
  res: 0,
  mass: 0,
  dq: 0,

  states: {
    default:[
      [0, 0, -1, 1, 0]
    ],
    off: [
      [1, 0, 0, 0, 0]
    ],
  },

  update: function(time_step = 1/60) {
    if(this.open > 0) {
      this.state = 'default';
      this.res = this.res_default/Math.pow(this.open, 2);
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
      this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq];
    } else {
      this.state = 'off';
    }
  }
}

let valve2 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx: 0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  open: 0,
  res_default: 100000,
  res: 0,
  mass: 0,
  dq: 0,

  states: {
    default:[
      [0, 0, -1, 1, 0]
    ],
    off: [
      [1, 0, 0, 0, 0]
    ],
  },

  update: function(time_step = 1/60) {
    if(this.open > 0) {
      this.state = 'default';
      this.res = this.res_default/Math.pow(this.open, 2);
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
      this.states.default[0] = [this.res, 0, -1, 1, -1*this.mass*this.dq];
    } else {
      this.state = 'off';
    }
  }
}

let pump = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx: 0},
    out: {p: 0, q: 0, height: 0, idx: 1},
  },

  revs: 0,
  res: 100000,
  dP: 0,
  D_impeller: 0.25,
  A: Math.PI*Math.pow(0.032, 2),


  states: {
    default:[
      [1000000, 0, -1, 1, 0]
    ],
    cav: [
      [0, 0, -1, 1, 0]
    ],
  },

  update: function(g = 9.81, rho = 997) {
    this.state = 'default';
    let q_prev = 0;
    if (this.terminals.in.history) {
      if (this.terminals.in.history[0]) {
        q_prev = this.terminals.in.history[0].q;
      }
    }
    this.dP = 0.00014*g*rho*Math.pow(this.D_impeller*this.revs,2) - 0.5*rho*Math.pow((1/60000)*q_prev/this.A,2); //this one assumes q_prev in LPM
    if (this.terminals.in.p < 3000) {
      // this.dP *= 0.3;
      this.revs *= 0.9;
    }
    this.states.default[0] = [this.res, 0, -1, 1, this.dP];
  }
}

let mains = {
  terminals: {
    low: {p: 0, q: 0, height: 0, idx: 0},
    high: {p: 0, q: 0, height: 0, idx: 1},
  },
  states: {
    default:[
      [0, 0, -1, 1, 400000]
    ]
  },
}

let atmo = {
  terminals: {
    value: {p: 0, q: 0, height: 0, idx: 0},
  },
  states: {
    default:[
      [0, 1, 100000]
    ]
  },
}

let atmo2 = {
  terminals: {
    value: {p: 0, q: 0, height: 0, idx: 0},
  },
  states: {
    default:[
      [0, 1, 500000]
    ]
  },
}


let thisNet = {
  devices: [],
  devices_multiterminal: [],
  terminals: [],
  links: [],
  nodes: [],
  matrix: [],
  solutions: [],
  history: [],
  max_history: 5,

  create_link: function(term1, term2) {
    let newLink = [term1, term2];
    let rev = [term2, term1];
    if (this.terminals.indexOf(term1) > -1 && this.terminals.indexOf(term2) > -1) {
      if (this.devices.indexOf(newLink) < 0 && this.devices.indexOf(rev) < 0) {
        this.links.push(newLink);
      } else {
        console.log(`A link between ${term1} & ${term2} is already established in this Network`);
      }
    } else {
      console.log('At least one of the terminals is not part of this Network. No link created!');
    }
  },

  add_device: function(device) {
    if (this.devices.indexOf(device) < 0) {
      this.devices.push(device);
      if(device.terminals) {
        for (let t in device.terminals) {
          this.terminals.push(device.terminals[t]);
          device.terminals[t].id = this.terminals.length - 1;
        }
        if(Object.keys(device.terminals).length > 1) {
          this.devices_multiterminal.push(device);
        }
      } else {
        console.log(`Device ${device} has no terminals to add to network`);
      }
    } else {
      console.log(`Device ${device} not added - already in this Network.`)
    }
  },

  build_nodes: function() {
    this.nodes = [];
    for (let i = 0, l = this.terminals.length; i < l; i++) {
      let term = this.terminals[i];
      let newNode = [];

      //first check to see that this terminal is not already part of some node.
      if (this.nodes.length > 0) {
        for (let j = 0, m = this.nodes.length; j < m; j++) {
          if (this.nodes[j].indexOf(term) < 0) {
            //this node doesn't contain this terminal. Proceed to next node, unless...
            if (j == m - 1) {
              //if we have looked at all of the nodes and this terminal wasn't present
              //add it to newNode
              newNode.push(term);
            }
          } else {
            //this terminal already is part of a node. We do not need to create a new node.
            break;
          }
        }
      } else {
        //if there are no nodes yet...
        newNode.push(term);
      }

      //need to then seek out the terminals this is linked to.
      //use the length of newNode as a filter for whether to proceed.
      if (newNode.length > 0) {
        for (let j = 0, m = this.links.length; j < m; j++) {
          let thisLink = this.links[j];
          if (this.links[j].indexOf(term) > -1) {
            //if the terminal is found in a link...add the linked terminal to newNode
            this.links[j].forEach (
              (terminal) => {
                if (terminal != term) {
                  newNode.push(terminal);
                }
              }
            );
          }
        }
        this.nodes.push(newNode);
      }
    }
  },

  build_matrix: function() {
    this.matrix = [];
    //initialise matrix of just the right size. Should be T x (T + 1), T = terminals.length
    for (let i = 0, l = this.links.length + this.nodes.length; i < l; i++) {
      let thisRow = [];
      for (let j = 0 ; j < l + 1; j++) {
        thisRow.push(0);
      }
      this.matrix.push(thisRow);
    }
    //now that the matrix is initialised, begin completing entries
    //this loop adds a series of flow-balance equations in the top half of the matrix
    for (let i = 0, l = this.devices_multiterminal.length; i < l; i++) {
      let dev = this.devices_multiterminal[i];
        for (let t in dev.terminals) {
          let term = dev.terminals[t];
          //go through the list of links, find matches
          for (let j = 0, m = this.links.length; j < m; j++) {
            let idx = this.links[j].indexOf(term);
            if (idx == 0) {
              this.matrix[i][j] = -1;
            } else if (idx == 1) {
              this.matrix[i][j] = 1;
            }
          }
        }
    }

    //this loop adds device-specific equations that usually equate to a pressure value
    for (let i = 0, l = this.devices.length, currentRow = this.devices_multiterminal.length; i < l; i++) {
      //already, rows 0 -> l - 2 are filled, so we have to begin at row l - 1.
      let dev = this.devices[i];
      //check each of the device's equations in turn
      let num_terms = Object.keys(dev.terminals).length;
      let state = 'default';
      if (dev.state) {
        state = dev.state;
      }
      let eqs = dev.states[state];
      eqs.forEach((eq) => {
        //check for terms pertaining to flows
        for (let j = 0; j < num_terms; j++) {
          let coefficient = eq[j];
          if (coefficient != 0) {
            //work out which terminal it pertains to
            //work out which links k this terminal belongs to
            //for each of these links, work out if it's the first or second entry
            //if it's the first entry, subtract coefficient from position k of this device's row
            //if it's the second entry, add this coefficient to position k of this device's row.
            for (let t in dev.terminals) {
              let term = dev.terminals[t];
              if (term.idx == j) {
                for (let k = 0, n = this.links.length; k < n; k++) {
                  let link = this.links[k];
                  let idx = link.indexOf(term);
                  if (idx == 0) {
                    this.matrix[currentRow][k] = -1*coefficient;
                  } else if (idx == 1) {
                    this.matrix[currentRow][k] = 1*coefficient;
                  }
                }
              }
            }
          }
        }
        //check for terms pertaining to pressures
        for (let j = 0; j < num_terms; j++) {
          let coefficient = eq[j + num_terms];
          if (coefficient != 0) {
            //work out which node it pertains to
            //add this coefficient to position links.length + index of the relevant node
            for (let t in dev.terminals) {
              let term = dev.terminals[t];
              if (term.idx == j) {
                for (let k = 0, n = this.nodes.length; k < n; k++) {
                  let node = this.nodes[k];
                  let idx = node.indexOf(term);
                  if (idx > -1) {
                    // console.log(currentRow, this.links.length + k);
                    // if(!this.matrix[currentRow]) {
                    //   let newRow = [];
                    //   while (newRow.length < this.terminals.length + 1) {
                    //     newRow.push(0);
                    //     // console.log('psh');
                    //   }
                    //   this.matrix.push(newRow);
                    // }
                    this.matrix[currentRow][this.links.length + k] = coefficient;
                  }
                }
              }
            }
          }
        }
        //place the value from the device equation at the end of the matrix row
        let value = eq[eq.length - 1];
        this.matrix[currentRow][this.matrix[currentRow].length - 1] = value;
        currentRow++;
      });

    }
  },

  update: function() {
    //solve a clone of the matrix
    let solved = clone_matrix(this.matrix);
    gje(solved);
    //extract from the last column of the solved matrix all of the flows and pressures
    //build a solutions array. Then, the solutions should be in order of the links list, then the nodes list.
    let sol = [];
    for (let i = 0, l = solved.length; i < l; i++) {
      sol.push(solved[i][l]);
    }

    //distribute the solutions to the terminals listed. Make sure the flows have the right sign.
    //first, go through the list of terminals, and set all of the pressures and flows to zero.
    this.terminals.forEach((t) => {
      if (!t.history) {
        t.history = [];
      }
      t.history.unshift({p: t.p, q: t.q});
      if (t.history.length > this.max_history) {
        t.history.pop();
      }
      t.p = 0;
      t.q = 0;
    });
    //go through list of links.
    //for link i, the first terminal gets a flow of -1*sol[i], the second gets sol[i].
    for (let i = 0, l = this.links.length; i < l; i++) {
      let link = this.links[i];
      link[0].q -= sol[i];
      link[1].q += sol[i];
    }

    //go through the list of nodes. for node i, each terminal gets a pressure of sol[i + this.links.length];
    for (let i = 0, l = this.nodes.length; i < l; i++) {
      let node = this.nodes[i];
      node.forEach((t) => {
        t.p += sol[i + this.links.length];
      });
    }
    //use this information to update each device. For instance, a relief valve may be triggered by a change in pressure, or
    //a pressure control unit will vary its resistance depending on the pressure drop across its terminals
    this.devices.forEach((dev) => {
      if(dev.update) {dev.update();}
    });


    //remove the last entry from the network's history
    //clone the solutions array and append to the start of the history array.
    if (this.history.length == 0) {
      for (let i = 0, l = this.max_history; i < l; i++) {
        let zeros = [];
        for (let j = 0, m = this.terminals.length + 1; j < m; j++) {
          zeros.push(0);
        }
        this.history.push(zeros);
      }
    }
    this.history.unshift(sol);
    if(this.history.length > this.max_history) {
      this.history.pop();
    }
    //

  }

}
// thisNet.add_device(mains);
thisNet.add_device(pipe1);
thisNet.add_device(valve1);
thisNet.add_device(pump);
thisNet.add_device(valve2);
thisNet.add_device(pipe2);
thisNet.add_device(branch);
thisNet.add_device(atmo);
// thisNet.add_device(tank);
thisNet.add_device(atmo2);
thisNet.create_link(atmo2.terminals.value, pipe1.terminals.in);
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

  requestAnimationFrame(update);
}

update();
