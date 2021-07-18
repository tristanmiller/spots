//this contains various functions that become important when there are mixed media in the network
//e.g. air and water will be encountered in the system
//it creates another topology layer for the network, breaking it into 'Segments', which are delineated by junctions.
//the movement of blobs of different fluids are tracked through the Segments, and distributed into other Segments at junctions.

//also going to need to define different fluids
///this will include their viscosity, density (and maybe compressibility)
///but maybe also some other parameters, like heat capacity, latent heats, thermal conductivity
///which materials they branch into if condensed or evaporated, fluids they can mix with, fluids they CAN'T mix with
///all this will be used to support a wider range of fluid behaviours


//a Segment contains
///an ordered list of the devices in the segment
///an ordered list of blobs in the segment (with their lengths)
///the total volume of the Segment
///the start and end terminals of the Segment
///a joke

let Segment = function() {
  this.devices = [];
  this.blobs = [];
  this.volume = 0;
  this.terminals= {
  };
}

Segment.prototype.addDevice = function(device, terminal) {
  device.segment = this;
  this.devices.push(device);
  if(device.volume) {
    this.volume += device.volume;
  }
  //things to do if this is the first device in the Segment
  if(this.devices.length == 1) {
    this.terminals.start = terminal;
  }

  //work out if there is another device to add
  //go to the other terminal of this device.
  let otherTerminal;
  for (let t in device.terminals) {
    if (device.terminals[t] != terminal) {
      otherTerminal = device.terminals[t];
    }
  }
  let node = otherTerminal.node;
  if (node.length == 2) {
    //it's possible this can be continued, if the next device has two terminals, and isn't this device.
    //first, get the terminal that isn't part of this device (if it exists)
    for (let i = 0, l = node.length; i < l; i++) {
      if (node[i] != otherTerminal) {
        let nextDevice = node[i].device;
        if (Object.keys(nextDevice.terminals).length == 2 && !nextDevice.segment) {
          let nextTerm = node[i];
          this.addDevice(nextDevice, nextTerm);
        }
      }
    }
  }

  //if we have ended up here, it's time to end the segment.
  if (!this.terminals.end) {
    this.terminals.end = otherTerminal;
  }
}

//build an array of the blobs to be exported from the Segment
//at the same time, should be removing material from the Segment's blobs array.
Segment.prototype.buildOutflowSequence = function(time_step = 1/60) {
  //determine the outflowing terminal of the Segment
  let outflowSequence = [];
  let outflowTerminal = this.terminals.end;
  if (outflowTerminal.q > 0) {
    outflowTerminal = this.terminals.start;
  }

  let blobSequence = this.blobs.slice();
  if (outflowTerminal == this.terminals.start) {
    blobSequence.reverse();
  }

  let outflowVolume = -1*outflowTerminal.q*time_step;
  //now investigate the blob sequence and progressively drain the blobs into
  //outflowSequence until the outflowVolume is accounted for
  for (let i = 0, l = blobSequence.length; i < l; i++) {
    let thisBlob = blobSequence[i];
    let newBlob = Object.assign({}, thisBlob);
    if (newBlob.volume >= outflowVolume) {
      newBlob.volume = outflowVolume;
      thisBlob.volume -= outflowVolume
    } else {
      delete blobSequence[i];
    }
    outflowSequence.push(newBlob);
    outflowVolume -= newBlob.volume;
    if(outflowVolume == 0) {
      break;
    }
  }
  //now have to transport the remaining blobs to the end of the Segment.
  //note this could also just be handled in the 'distribute to Segments stage' in which
  //internal distribution is the first step (may need this sorta approach if something
  //complicated is going to happen?)
  blobSequence = blobSequence.filter(
    elm => {
      let blobby = false;
      if (elm instanceof Fluidblob) {
        blobby = true;
      }
      return blobby;
    }
  );

  if (outflowTerminal = this.terminals.start) {
    blobSequence.reverse();
  }
  this.blobs = blobSequence.splice();
  this.outflowSequence = outflowSequence;
}

Segment.prototype.handleInflowSequence = function () {
  if (this.inflowSequence) {
    if (this.inflowSequence.length > 0) {
      //push the blobs in the inflowSequence to the segment's blob list.
      //that's what you would do if the 'start' terminal were an inflow terminal.
      //however, if the 'end' terminal is an inflow terminal, the blob list must be reversed, then added to.
      let blobSequence = this.blobs.slice();
      if (outflowTerminal == this.terminals.start) {
        blobSequence.reverse();
      }

      for (let i = 0, l = inflowSequence.length; i < l; i++) {
        let newBlob = Object.assign({}, inflowSequence[i]);
        blobSequence.push(newBlob);
      }

      if (outflowTerminal == this.terminals.start) {
        blobSequence.reverse();
      }

      this.blobs = blobSequence.slice();
      this.inflowSequence = [];

    }
  }
}

let SegmentMap = function (network) {
  this.segments = [];
  if(network) {
    this.network = network;
    this.buildSegmentMap(network);
  }
}

SegmentMap.prototype.addNewSegment = function(segment) {
  if (!segment) {segment = new Segment();}
  this.segments.push(segment);
  segment.id = this.segments.length - 1;
}

SegmentMap.prototype.beginNewSegments = function(node) {
  for (let i = 0, l = node.length; i < l; i++) {
    let terminal = node[i];
    if (!terminal.device.segment && Object.keys(terminal.device.terminals).length != 1) {
      let s = new Segment();
      this.addNewSegment(s);
      s.addDevice(terminal.device, terminal);
      if (s.terminals.end) {
        let endNode = s.terminals.end.node;
        this.beginNewSegments(endNode);
      }
    }
  }
}

SegmentMap.prototype.buildSegmentMap = function(network) {
  //traverse network, and build a map of all segments.
  let devices = network.devices;
  //look for a 'source'
  for (let d in devices) {
    //is d a single-terminal device?
    if(Object.keys(devices[d].terminals).length == 1) {
    //find the Node it is connected to
      let term = devices[d].terminals.value;
      let node = term.node;
      //for each other terminal in the node, attempt to start a new segment
      this.beginNewSegments(node);
    }
  }
  //look for a node with more than 2 terminals, then pick one device from that node
  let nodes = network.nodes;
  for (let n in nodes) {
    if(nodes[n].length > 2) {
      let node = nodes[n];
      //investigate further - pick a device and do the thing
      this.beginNewSegments(node);
    }
  }
  //start on any node
  for (let n in nodes) {
    //investigate each device connected to the node. Is it already part of a Segment?
    let node = nodes[n];
    this.beginNewSegments(node);
  }
}

SegmentMap.prototype.distributeOutflows = function(cycles = 6, time_step = 1/60) {
  //this requires that all relevant Segments have had their outflowSequence determined
  //now to work out where these flows end up!

  //for each node, work out which terminals are outflows from Segments, and which are inflows to Segments
  //also count any P_value terminals as Segments for this purpose.
  let nodes = this.network.nodes;
  for (let n in nodes) {
    let node = nodes[n];
    let segmentOutflows = [];
    let segmentInflows = [];
    for (let i = 0, l = node.length; i < l; i++) {
      let term = node[i];
      if (term.q < 0) {
        segmentOutflows.push(term);
      } else if (term.q > 0) {
        segmentInflows.push(term);
      }
    }
    //if there are more than one outflow terminals, combine their outflowSequences in the following way:
    //order the terminals in descending order of outflow volume (not that important really)
    //for n cycles, take 1/n of each outflowSequence and push to a new, combined outflowSequence
    let combinedOutflowSequence = [];

    for (let i = 0; i < cycles; i++) {
      for (let t = 0; t < segmentOutflows.length; t++) {
        let term = segmentOutflows[t];
        let vol = -1*term.q*time_step/cycles;
        if(term.device.segment) {
          let outflowSequence = term.device.segment.outflowSequence;
          for (let j = 0, m = outflowSequence.length; m < k; j++) {
            let thisBlob = outflowSequence[j];
            let newBlob = Object.assign({}, thisBlob);
            //how much volume is in this blob? Is it less than 1/n of the outflow volume?
            if (newBlob.volume >= vol) {
              newBlob.volume = vol;
              thisBlob.volume -= vol;
            } else {
              delete outflowSequence[j];
            }
            combinedOutflowSequence.push(newBlob);
            vol -= newBlob.volume;
            if(vol == 0) {
              break;
            }
          }
          //tidy up outflowSequence by removing deleted elements
          outflowSequence = outflowSequence.filter(blob => blob instanceof Fluidblob);
        } else if (term.device instance of P_value) {
          //If the outflow terminal belongs to a P_value then it supplies q/time_step of whatever fluid it's set to provide
          let newBlob = new Fluidblob(term.device.fluid, vol);
          combinedOutflowSequence.push(newBlob);
        }
      }
    }

    let vol = 0
    for (let i = 0, l = combinedOutflowSequence.length; i < l; i++) {
      let thisBlob = combinedOutflowSequence[i];
      vol += thisBlob.volume;
    }

    for (let i = 0, l = combinedOutflowSequence.length; i < l; i++) {
      let thisBlob = combinedOutflowSequence[i];
      for (let t = 0; t < segmentInflows.length; t++) {
        let term = segmentInflows[t];
        let proportion = term.q/vol;

        //TODO: this all assumes the segment only has one inflow terminal
        //need some way of handling multi-terminal devices that are either treated as their own segment,
        //or have their own method of handling their potential multiple inflows/outflows.
        if (!term.device instanceof P_value) {
          if (!term.device.segment.inflowSequence) {
            term.device.segment.inflowSequence = [];
          }
          let inflowSequence = term.device.segment.inflowSequence;
          let newBlob = Object.assign({}, thisBlob);
          newBlob.volume *= term.q*time_step/vol;
          inflowSequence.push(newBlob);
        }
      }
    }
      //if there are more than one inflow terminals, distribute the outflow to them in the following way:
      //distribute each fluidblob in the sequence proportionately according to inflow volumes.
      //this way, the sequence of blobs is maintained into each of the connected Segments.



      //If the inflow terminal is a P_value, no need to distribute blobs to it, they simply vanish from the simulation

      //all this assumes that the outflows < the segment volumes. This can be assured with a suitable timestep for a given scenario, or
      //by applying a dynamic timestep that scales according to the the severity of the overflows.


  }


}





let Fluidblob = function (fluid, volume) {
  this.fluid = fluid;
  this.volume = volume;
}


let Fluid = function (name = 'Mystery Fluid', rho = 997, visc = 8.9e-4) {
  this.name = name;
  this.rho = rho;
  this.visc = visc;
}
