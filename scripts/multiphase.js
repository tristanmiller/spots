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
  this.devices.push(device);
  if(device.volume) {
    this.volume += device.volume;
  }
  //things to do if this is the first device in the Segment
  if(this.devices.length == 1) {
    this.terminals.start = terminal;
  }
}

//traverse network, and build a map of all segments.
let buildSegmentMap = function(network) {
  let segments = []
  let devices = network.devices;
  //look for a 'source'
  for (let d in devices) {
    //is d a P_value?
    if(d instanceof P_value) {
    //find the Node it is connected to
      let term = d.terminals.value;
      let node = term.node;
      //for each other terminal in the node, attempt to start a new segment
      for (let t in node) {
        if(node[t] != term) {
          //attempt to start a new segment
          let thisDevice = node[t].device;
          if(!thisDevice.segment) {
            //do a thing. in this case, doing a thing is: adding a new segment to the network. adding d to this segment.
            let s = new Segment()
            addNewSegment(segments, s);
            s.addDevice(thisDevice, node[t]);
            //then work out whether to add another device to this Segment, or to close it off here.
            //the reasons to close off are: it's a device with 3+ terminals, the next device is a device with 3+ terminals, or is a P_value
            // or...the next NODE has more than two terminals in it.
          }
        }
      }
    }
  }
  //look for a node with more than 2 terminals, then pick one device from that node
  let nodes = network.nodes;
  for (let n in nodes) {
    if(nodes[n].terminals > 2) {
      //investigate further - pick a device and do the thing
    }
  }
  //start on any node
  for (let n in nodes) {
    //investigate each device connected to the node. Is it already part of a Segment?
  }
}

let addNewSegment = function(segmentMap, segment) {
    if (!segment) {segment = new Segment();}
    segmentMap.push(segment);
    segment.id = segmentMap.length - 1;
}
