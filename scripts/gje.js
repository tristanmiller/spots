//try to do g-j elimination on an augmented matrix

//never mind how to automatically get the matrix in augmented form - worry about that later...

//Trial model - system of three equations with three unknowns
//so we will have a 3 x 4 matrix
//in general, we will have n equations, n unknowns, and a n x (n + 1) matrix to do row reduction upon.

//row ops can only include add/subtract a row, multiply a row, or add/subtract a multiple of a row, or swap rows

//[ 1  2  3 |  4]
//[ 2  2  1 |  3]
//[ 3  3  1 | -2]


//matrix should be constructed to avoid a zero in the 1,1 (0,0) element. Work on this process later.
//start with row 1
//is there a 1 already there? If so, move on to row 2

//row 2. Is there a zero in the 1st element of this row?
//if not, work out some multiple of the previous row to subtract in order to make this happen.
// in this case...go to row 1. need to subtract 2x row1. Iterate through elements and mutate row2 accordingly

//[ 1  2  3 |  4]
//[ 0 -2 -5 | -5]
//[ 3  3  1 | -2]

//check again for a zero. If successful, check for a 1 in the second element.
//If not, multiply entire row by whatever factor is required. In this case, it's -0.5.
//if there's a zero there now we may have an issue with the independence of the equations. Try swapping with the next row..

//[ 1  2  3 |  4]
//[ 0  1  2.5 | 2.5]
//[ 3  3  1 | -2]

//repeat for row 3.

//[ 1  2  3 |  4]
//[ 0  1  2.5 | 2.5]
//[ 0 -6 -8 | -14]  (-3 * row 1)

//[ 1  2  3 |  4]
//[ 0  1  2.5 | 2.5]
//[ 0  0 -23 | -29]  (6* row 2)

//[ 1  2  3 |  4]
//[ 0  1  2.5 | 2.5]
//[ 0  0  1 | 29/23]  (* -1/23)

//Provided there is a unique solution we can do the following:
//Start with row 1
//subtract element2*row2
//subtract element3*row3

//move to row 2
//subtract element3*row3

//Then read off values. unk 1 = row 1, element 4, unk 2 = row 2, element 4 etc.



//This function takes the matrix to be 'solved' as an argument, and outputs a list of solutions (or fails gracefully and reports the error)

let gje = (M) => {
  //implement some checks here. Matrix should be n + 1 columns with n rows, for instance. For now, assume well-formed input M
  for (let col = 0, l = M[0].length - 1; col < l; col++) {
    console.log(`now working on col ${col}`);
    //reorder rows, in descending order of value in the current column
    for (let row = col, m = M.length; row < m; row++) {
      console.log(`now working on row ${row}`);
      if (M[row][col] == 0) {
        //do nothing. go to next row
        console.log('zero here, going to next row');
      } else {
        //check to see if this row can be promoted
        //if there are any rows above...
        if (M[row - 1]) {
          let temp_row = row;
          console.log(`temp_row initialised at ${temp_row}`);
          while (M[temp_row - 1] && temp_row - 1 >= col) {
            console.log(`temp_row is ${temp_row}`);
            if (M[temp_row - 1][col] == 0 || M[temp_row - 1][col] < M[temp_row][col]) {
              //promote row - swap with the row above.
              console.log('promoting');
              [M[temp_row - 1], M[temp_row]] = [M[temp_row], M[temp_row - 1]];
              //decrement temp_row
              temp_row--;
            } else {
              //do nothing - row can't be promoted any higher.
              console.log('can not promote');
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
let revs = 2000;
let rho = 997;
let g = 9.81;
let A = Math.PI*0.064*0.064;
let Q_prev = 0;
let dP = 0.00014*g*rho*Math.pow(d*revs,2) - 0.5*rho*Math.pow(Q_prev/A,2);

console.log(dP);

let test_matrix = [
  [1, -1, 0, 0, 0, 0, 0],
  [0, 1, -1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 5000, -1, 1, 0, dP],
  [3000, 0, 0, 0, -1, 1, 0],
  [0, 5000, 0, 1, 0, -1, 0],
]


console.log(test_matrix);
gje(test_matrix);
