let Network = function (max_history = 5) {
  this.devices = [];
  this.devices_multiterminal = [];
  this.terminals = [];
  this.links = [];
  this.nodes = [];
  this.matrix = [];
  this.solutions = [];
  this.history = [];
  this.max_history = max_history;
}


Network.prototype.create_link = function(term1, term2) {
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
};

  Network.prototype.add_device = function(device) {
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
};

Network.prototype.build_nodes = function() {
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
      for (let t in newNode) {
        let term = newNode[t];
        term.node = newNode;
      }
    }
  }
};

Network.prototype.set_heights = function() {
  //visit each node
  //visit each terminal in the node
  //if it's the first node, on the first terminal...
  ////if it doesn't already have a height_abs
  /////term.height_abs = term.height
  /////nodeheight = term.height_abs.

  ///apply this nodeheight to the other terminal's term.height_abs
  ///somehow get the devices that the terminals belong to, and using the other terminals' relative heights, give them absolute heights.
  /// do this at component initialisation. then it's just term.device and we can see what the other terminals are like.

  ///simplest thing to do is to just specify the heights of the terminals manually, this offers greater flexibility anyway.
}

Network.prototype.build_matrix = function() {
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
      //if there is a height difference between the two terminals, modify the above value accordingly
      currentRow++;
    });

  }
};

Network.prototype.update = function() {
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
};
