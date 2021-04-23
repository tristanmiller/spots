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
      console.log(`Somehow we are dividing by zero. Something has gone wrong`);
    }
  }
  console.log(M);
}

let sager_matrix = [
  [1, -1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,   0],
  [0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0,   0],
  [0, 0, 0, -1, 0, -1, 1, -1, 0, 0, 0, 0,   0],
  [0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0,   0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,   0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,   0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,   0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0,   0.75],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 0,   0.75],
  [0, 0, -4700, 0, -4700, 0, 0, 0, -1, 0, 0, 1,   0],
  [0, 0, 0, -4700, 0, -4700, 0, 0, 0, -1, 0, 1,   0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 1,   5],
]

let f = 5;
let d = 0.3;
let revs = 0;
let rho = 997;
let g = 9.81;
let A = Math.PI*0.064*0.064;
let Q_prev = 0;
let dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow((1/60000)*Q_prev/A,2);

console.log(dP);

let test_matrix = [
  [1, -1, 0, 0, 0, 0, 0],
  [0, 1, -1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 100000],
  [0, 0, 0, -1, 1, 0, 400000],
  [300, 0, 0, 0, -1, 1, dP],
  [0, 500, 0, 1, 0, -1, 0],
];

let test_matrix_p = [
  [1, -1, 0, 0, 0, 0, 0, 0,   0],
  [0, 1, -1, 0, 0, 0, 0, 0,   0],
  [0, 0, 1, -1, 0, 0, 0, 0,   0],
  [0, 0, 0, 0, 1, 0, 0, 0,   100000],
  [0, 0, 0, 0, -1, 1, 0, 0,   400000],
  [100, 0, 0, 0, 0, -1, 1, 0,   0],
  [0, 300, 0, 0, 0, 0, -1, 1,   dP],
  [0, 0, 500, 0, 1, 0, 0, -1,   0]




]


console.log(test_matrix_p);
gje(test_matrix_p);
