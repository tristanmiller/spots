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
  let resistance = 8*visc*length/(Math.PI*Math.pow(radius, 4));
  return resistance;
}

console.log(poiseuille(0.032, 5, 8.9e-4));

let pipe1 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx_p: 2, idx_q: 0},
    out: {p: 0, q: 0, height: 0, idx_p: 4, idx_q: 1},
  },
  states: {
    default:[
      [300, 0, -1, 1, 0]
    ]
  },
}

let pipe2 = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx_p: 2, idx_q: 0},
    out: {p: 0, q: 0, height: 0, idx_p: 4, idx_q: 1},
  },
  states: {
    default:[
      [500, 0, -1, 1, 0]
    ]
  },
}
let dP_test = 0;

let pump = {
  terminals: {
    in: {p: 0, q: 0, height: 0, idx_p: 2, idx_q: 0},
    out: {p: 0, q: 0, height: 0, idx_p: 4, idx_q: 1},
  },
  states: {
    default:[
      [300, 0, -1, 1, dP_test]
    ]
  },
}

let mains = {
  terminals: {
    low: {p: 0, q: 0, height: 0, idx_p: 2, idx_q: 0},
    high: {p: 0, q: 0, height: 0, idx_p: 4, idx_q: 1},
  },
  states: {
    default:[
      [0, 0, -1, 1, 400000]
    ]
  },
}

let atmo = {
  terminals: {
    value: {p: 0, q: 0, height: 0, idx_p: 2, idx_q: 0},
  },
  states: {
    default:[
      [0, 1, 100000]
    ]
  },
}


let thisNet = {
  devices: [],
  terminals: [],
  links: [],
  nodes: [],
  matrix: [],

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
    for (let i = 0, l = this.terminals.length; i < l; i++) {
      let thisRow = [];
      for (let j = 0 ; j < l + 1; j++) {
        thisRow.push(0);
      }
      this.matrix.push(thisRow);
    }

    //now that the matrix is initialised, begin completing entries
    for (let i = 1, l = this.devices.length; i < l; i++) {
      let dev = this.devices[i];
      for (let t in dev.terminals) {
        let term = dev.terminals[t];
        //go through the list of links, find matches
        for (let j = 0, m = this.links.length; j < m; j++) {
          let idx = this.links[j].indexOf(term);
          if (idx == 0) {
            this.matrix[i - 1][j] = -1;
          } else if (idx == 1) {
            this.matrix[i - 1][j] = 1;
          }
        }
      }
    }
  }
}
thisNet.add_device(mains);
thisNet.add_device(pipe1);
thisNet.add_device(pump);
thisNet.add_device(pipe2);
thisNet.add_device(atmo);

thisNet.create_link(mains.terminals.high, pipe1.terminals.in);
thisNet.create_link(pipe1.terminals.out, pump.terminals.in);
thisNet.create_link(pump.terminals.out, pipe2.terminals.in);
thisNet.create_link(pipe2.terminals.out, mains.terminals.low);
thisNet.create_link(mains.terminals.low, atmo.terminals.value);

thisNet.build_nodes();
thisNet.build_matrix();

console.log(thisNet);

/*
instantiate a device
it has terminals named according to that device

add device to Network
terminals are added to the Network's 'terminals' register

specify which devices are linked to others e.g.
link(pipe1.out, pump1.in);
or
link (manifold.out1, pipe2.in)

add to list of links
*/


let d = 0.25;
let revs = 0;
let rho = 997;
let g = 9.81;
let A = Math.PI*0.064*0.064;
let Q_prev = 0;
let Q_prev_prev = 0;
let dt = 1/60;
let dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow((1/60000)*Q_prev/A,2);

console.log(dP);



let test_matrix_p = [
  [1, -1, 0, 0, 0, 0, 0, 0,   0],
  [0, 1, -1, 0, 0, 0, 0, 0,   0],
  [0, 0, 1, -1, 0, 0, 0, 0,   0],
  [0, 0, 0, 0, 1, 0, 0, 0,   100000],
  [0, 0, 0, 0, -1, 1, 0, 0,   400000],
  [322, 0, 0, 0, 0, -1, 1, 0,   0],
  [0, 300, 0, 0, 0, 0, -1, 1,   dP],
  [0, 0, 500, 0, 1, 0, 0, -1,   0]
];


let RPM_slider = document.getElementById('RPM');
let RPM_output = document.getElementById('RPM_value');
let P_in_display = document.getElementById('P_inlet');
let P_out_display = document.getElementById('P_outlet');
let flow_display = document.getElementById('flowrate');

RPM_output.innerHTML = RPM_slider.value;
revs = RPM_slider.value;

RPM_slider.oninput = function() {
  RPM_output.innerHTML = this.value;
  revs = this.value;
}





let update = () => {
  let M_solved = clone_matrix(test_matrix_p);
  gje(M_solved);
  Q_prev_prev = Q_prev;
  Q_prev = M_solved[0][M_solved[0].length - 1];
  dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow((1/60000)*Q_prev/A,2);
  test_matrix_p[6][8] = dP;
  test_matrix_p[5][8] = -12000*(Q_prev - Q_prev_prev)*dt;
  test_matrix_p[7][8] = -12000*(Q_prev - Q_prev_prev)*dt;

  let P_in = M_solved[6][8];
  let P_out = M_solved[7][8];
  P_in_display.innerHTML = `${Math.round(P_in/1000)} kPa`;
  if(P_in < 100000) {
    P_in_display.style.color = `red`;
  } else {
    P_in_display.style.color = `black`;
  }
  P_out_display.innerHTML = `${Math.round(P_out/1000)} kPa`;
  flow_display.innerHTML = Math.round(Q_prev);

  requestAnimationFrame(update);
}


update();
