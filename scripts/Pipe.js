function Pipe (diameter, pipe_length, angle, pos_start) {
    //basically - create however many elements are needed,
    //stitch them together with interfaces
    let N = pipe_length/ELEMENT_LENGTH; //what happens if N is not an integer?
    // Give priority to the specified length of the pipe - expand/contract the elements as necessary
    N = Math.floor(N);
    let element_length = pipe_length/N;
    this.elements = [];
    this.interfaces = [];

    for (let i = 0; i < N; i++) {
        // create element
        let strt = pos_start;
        if (i > 0) {strt = this.elements[i - 1].pos_end;}
        let elm = new Element(diameter, element_length, angle, strt);
        this.elements.push(elm);
    }

    this.startElement = this.elements[0];
    this.endElement = this.elements[this.elements.length - 1];

    this.pos_start = pos_start;
    this.pos_end = this.endElement.pos_end;

    for (let i = 1; i < N; i++) {
      //create interfaces
        let iface = new Interface([this.elements[i - 1], this.elements[i]]);
        this.interfaces.push(iface);
    }
}

Pipe.prototype.fill = function (fluid, pressure) {
  for (let i = 0, l = this.elements.length; i < l; i++) {
    this.elements[i].fill(fluid, pressure);
  }
}

Pipe.prototype.checkMassFlows = function() {
  for (let i = 0, l = this.elements.length; i < l; i++) {
    if(this.elements[i].checkMassFlows()) {
      this.checkMassFlows();
    }
  }
}

Pipe.prototype.update = function() {
  for (let i = 0, l = this.interfaces.length; i < l; i++) {
    this.interfaces[i].calculateMassFlows();
  }

  this.checkMassFlows();

  for (let i = 0, l = this.interfaces.length; i < l; i++) {
    this.interfaces[i].resolveMassFlows();
  }
  for (let i = 0, l = this.elements.length; i < l; i++) {
    this.elements[i].update();
  }
}
