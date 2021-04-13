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
