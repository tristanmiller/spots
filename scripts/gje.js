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


let d = 0.3;
let revs = 0;
let rho = 997;
let g = 9.81;
let A = Math.PI*0.064*0.064;
let Q_prev = 0;
let dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow((1/60000)*Q_prev/A,2);

console.log(dP);



let test_matrix_p = [
  [1, -1, 0, 0, 0, 0, 0, 0,   0],
  [0, 1, -1, 0, 0, 0, 0, 0,   0],
  [0, 0, 1, -1, 0, 0, 0, 0,   0],
  [0, 0, 0, 0, 1, 0, 0, 0,   100000],
  [0, 0, 0, 0, -1, 1, 0, 0,   400000],
  [300, 0, 0, 0, 0, -1, 1, 0,   0],
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

  Q_prev = M_solved[0][M_solved[0].length - 1];
  dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow((1/60000)*Q_prev/A,2);
  test_matrix_p[6][8] = dP;

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
