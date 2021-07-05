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
