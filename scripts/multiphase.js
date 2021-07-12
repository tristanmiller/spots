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

//traverse network, and build a map of all segments.
let buildSegmentMap = function(network) {
  let segments = []
  let devices = network.devices;
  //look for a 'source'
  for (let d in devices) {
    //is d a P_value?
    if(devices[d] instanceof P_value || Object.keys(devices[d].terminals).length == 1) {
    //find the Node it is connected to
      let term = devices[d].terminals.value;
      let node = term.node;
      //for each other terminal in the node, attempt to start a new segment
      beginNewSegments(segments, node);
    }
  }
  //look for a node with more than 2 terminals, then pick one device from that node
  let nodes = network.nodes;
  for (let n in nodes) {
    if(nodes[n].length > 2) {
      let node = nodes[n];
      //investigate further - pick a device and do the thing
      beginNewSegments(segments, node);
    }
  }
  //start on any node
  for (let n in nodes) {
    //investigate each device connected to the node. Is it already part of a Segment?
    let node = nodes[n];
    beginNewSegments(segments, node);
  }
  console.log(segments);
}

let beginNewSegments = function(segmentMap, node) {
  for (let i = 0, l = node.length; i < l; i++) {
    let terminal = node[i];
    if (!terminal.device.segment && !(terminal.device instanceof P_value) && Object.keys(terminal.device.terminals).length != 1) {
      let s = new Segment();
      addNewSegment(segmentMap, s);
      s.addDevice(terminal.device, terminal);
      if (s.terminals.end) {
        let endNode = s.terminals.end.node;
        beginNewSegments(segmentMap, endNode);
      }
    }
  }
}

let addNewSegment = function(segmentMap, segment) {
    if (!segment) {segment = new Segment();}
    segmentMap.push(segment);
    segment.id = segmentMap.length - 1;
}
