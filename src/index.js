import React, { useCallback, useEffect, useState } from 'react'
import styled, { css } from 'styled-components'

const date = new Date()
const dateString = `${
  parseInt(date.getDate()) < 10 ? '0' + date.getDate() : date.getDate()
}-${
  parseInt(date.getMonth() + 1) < 10
    ? '0' + date.getMonth() + 1
    : date.getMonth() + 1
}-${date.getFullYear()}`

// API requires a DD/MM/YYYY format and the input field in html takes in a YYYY/MM/DD so we gotta convert

const dateStringInputToApiFormat = (dateString) => {
  // YYYY / MM / DD to DD / MM / YYYY
  const year = dateString.slice(0, 4)
  const month = dateString.slice(5, 7)
  const day = dateString.slice(8)
  return `${day}-${month}-${year}`
}

const dateStringApiToInputFormat = (dateString) => {
  // DD / MM / YYYY to YYYY / MM / DD
  const day = dateString.slice(0, 2)
  const month = dateString.slice(3, 5)
  const year = dateString.slice(6)
  return `${year}-${month}-${day}`
}

const allSquaresIndexes = []
for (let y = 0; y < 3; y++) {
  for (let x = 0; x < 3; x++) {
    // MAKING SQUARE
    const squareIndexes = []
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const activeSquareIndex = (i + y * 3) * 9 + j + x * 3
        squareIndexes.push(activeSquareIndex)
      }
    }
    allSquaresIndexes.push(squareIndexes)
  }
}

const StyledSudoku = styled.div`
  * {
    font-family: sans-serif;
  }
  width: 450px;

  .head {
    padding: 8px 0;
  }

  .sudoku-table {
    table-layout: fixed;
    padding: 0;
    width: 100%;
    border-collapse: collapse;
    border: 3px solid rgb(52, 72, 97);
    border-spacing: 0;
    background: white;

    tbody {
      tr {
        &:nth-child(3n) {
          border-bottom: 3px solid rgb(52, 72, 97);
        }
        td {
          padding: 0;
          margin: 0;
          height: 50px;
          width: 50px;
          border: 2px solid #b9cce4;
          text-align: center;
          font-size: 15px;

          &:nth-child(3n) {
            border-right: 3px solid rgb(52, 72, 97);
          }
        }
      }
    }
  }

  .buttons {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px;

    .right {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: space-between;
    }
  }
`

const cellStyleVariations = {
  focused: css`
    background: #a9c9d3;
  `,
  connected: css`
    background: #cee2e9;
  `,
  connectedNumber: css`
    /* background: #c4cad6; */
    background: #d6d3f0;
  `,
  incorrect: css`
    background: #dda4a4;
  `,
  inputtedManually: css`
    color: #6767aa;
  `,
  inputtedManuallyError: css`
    color: a73434;
  `
}

const StyledCell = styled.div`
  user-select: none;
  cursor: pointer;
  width: 100%;
  height: 100%;
  font-size: 30px;
  ${({ state }) => state.focused && cellStyleVariations.focused};
  ${({ state }) => state.connected && cellStyleVariations.connected};
  ${({ state }) =>
    state.connectedNumber && cellStyleVariations.connectedNumber};
  ${({ state }) => state.incorrect && cellStyleVariations.incorrect};
  ${({ state }) => !state.locked && cellStyleVariations.inputtedManually};
  position: relative;

  .content {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .annotation {
    position: absolute;
    top: 10%;
    left: 10%;
    font-size: 12px;
  }
`

const Cell = ({ children, annotation, state, onClickHandler, pos }) => {
  return (
    <StyledCell state={state} onClick={onClickHandler}>
      <div className='annotation'>{state.annotation}</div>
      <div className='content'>{children}</div>
    </StyledCell>
  )
}

const API_ENDPOINT = 'https://papergames-hetic.herokuapp.com/sudoku/'
// const API_ENDPOINT_LOCAL = 'http://localhost:3001/sudoku/'
const SELECT_ALL = 'SELECT_ALL'

const Sudoku = ({ key }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [gridValues, setGridValues] = useState('')

  const [isNoteMode, setIsNoteMode] = useState(false)

  const [dateState, setDateState] = useState(dateString)

  // no longer correct
  // const checkGrid = () => gridValues === sudoku.solution

  const clearInputs = () => {
    let gridCopy = [...gridValues]
    gridCopy = gridCopy.map((cell) => ({
      ...cell,
      content: cell.locked ? cell.content : null,
      focused: false,
      connected: false,
      connectedNumber: false,
      incorrect: false,
      annotation: ''
    }))
    setGridValues(gridCopy)
  }

  const editCellState = useCallback(
    (pos, prop, value) => {
      const gridCopy = [...gridValues]
      if (pos === SELECT_ALL) {
        for (const cell of gridCopy) cell[prop] = value
      } else {
        if (typeof pos === 'number') {
          gridCopy[pos][prop] = value
        } else {
          for (const p of pos) {
            gridCopy[p][prop] = value
          }
        }
      }
      setGridValues(gridCopy)
    },
    [gridValues]
  )

  const getConnectedCellsIndexes = (pos) => {
    const column = Math.floor(pos / 9)
    const row = pos % 9
    const connectedRow = new Array(9)
      .fill('')
      .map((_, index) => column * 9 + index)
    const connectedColumn = new Array(9)
      .fill('')
      .map((_, index) => row + index * 9)
    // const square = [Math.floor(column / 3) * 3, Math.floor(row / 3) * 3]
    const connectedSquares = []
    for (
      let i = Math.floor(column / 3) * 3;
      i < Math.floor(column / 3) * 3 + 3;
      i++
    ) {
      for (
        let j = Math.floor(row / 3) * 3;
        j < Math.floor(row / 3) * 3 + 3;
        j++
      ) {
        connectedSquares.push(i * 9 + j)
      }
    }

    // flatten and remove duplicates from array
    let mergedArray = [
      ...new Set([connectedRow, connectedColumn, connectedSquares].flat())
    ]
    // remove self from array
    mergedArray = mergedArray.filter((cell) => cell !== pos)
    return mergedArray
  }

  const getSameNumberCells = useCallback(
    (pos) => {
      const cellsIndexes = []
      gridValues
        .filter((cell) => cell.content !== null)
        .forEach(
          (cell, index) =>
            cell.content === gridValues[pos].content && cellsIndexes.push(index)
        )
      return cellsIndexes
    },
    [gridValues]
  )

  const getErrorCells = useCallback(() => {
    const errorRows = []
    for (let i = 0; i < 9; i++) {
      let row = gridValues.slice(i * 9, i * 9 + 9)
      const errorIndexes = []
      // just keeping the content we dont need the rest and it allows the use of array functions like includes
      row = row.map((cell, index) => cell.content)
      const occurences = new Array(9).fill([])
      row.forEach((cell, index) => {
        if (cell !== null)
          occurences[cell - 1] = [...occurences[cell - 1], index + i * 9]
      })
      occurences.forEach((positions, value) => {
        if (positions.length >= 2) errorIndexes.push(positions)
      })

      errorRows.push(errorIndexes)
    }

    const errorColumns = []
    for (let i = 0; i < 9; i++) {
      // get columns
      let column = gridValues.filter((_, index) => (index - i) % 9 === 0)
      const errorIndexes = []
      // just keeping the content we dont need the rest and it allows the use of array functions like includes
      column = column.map((cell, index) => cell.content)
      const occurences = new Array(9).fill([])
      // console.log(column)
      column.forEach((cell, index) => {
        if (cell !== null)
          occurences[cell - 1] = [...occurences[cell - 1], index * 9 + i]
      })
      occurences.forEach((positions, value) => {
        if (positions.length >= 2) errorIndexes.push(positions)
      })

      errorColumns.push(errorIndexes)
    }

    const errorSquares = []
    for (const squareIndexes of allSquaresIndexes) {
      const errorIndexes = []
      const occurences = new Array(9).fill([])
      squareIndexes.forEach((cellIndex) => {
        if (gridValues[cellIndex].content !== null)
          occurences[gridValues[cellIndex].content - 1] = [
            ...occurences[gridValues[cellIndex].content - 1],
            cellIndex
          ]
      })
      occurences.forEach((positions) => {
        if (positions.length >= 2) errorIndexes.push(positions)
      })

      errorSquares.push(errorIndexes)
    }

    // remove duplicates and flatten
    return [...new Set([errorRows, errorColumns, errorSquares].flat(3))]
  }, [gridValues])

  const cellUpdateKeyboard = useCallback(
    (pos) => {
      editCellState(SELECT_ALL, 'connectedNumber', false)
      editCellState(SELECT_ALL, 'incorrect', false)
      editCellState(getSameNumberCells(pos), 'connectedNumber', true)
      editCellState(getErrorCells(), 'incorrect', true)
    },
    [editCellState, getErrorCells, getSameNumberCells]
  )

  const cellFocus = useCallback(
    (pos) => {
      // remove focus on all cells
      editCellState(SELECT_ALL, 'focused', false)
      editCellState(SELECT_ALL, 'connected', false)
      // focus selected cell
      editCellState(getConnectedCellsIndexes(pos), 'connected', true)
      editCellState(pos, 'focused', true)
    },
    [editCellState]
  )

  // API REQUEST
  useEffect(() => {
    const getSudokuData = async () => {
      setLoading(true)
      setError(null)
      try {
        // eslint-disable-next-line no-undef
        const response = await fetch(`${API_ENDPOINT}${dateState}`, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': key
          }
        })
        console.log(response)
        const data = await response.json()
        if (data.error) {
          setError(data.error.toString())
          return setLoading(false)
        }
        const gridValues = data.puzzle.map((content) => ({
          content,
          locked: !!content,
          focused: false,
          connected: false,
          connectedNumber: false,
          incorrect: false,
          annotation: ''
        }))
        setGridValues(gridValues)
      } catch (error) {
        console.log(error)
        setError(error.toString())
      } finally {
        setLoading(false)
      }
    }
    getSudokuData()
  }, [dateState])

  // KEYBOARD EVENTS
  useEffect(() => {
    const keyboardCallback = ({ key }) => {
      // check if key is a number (and !== 0), check if cell isn't locked then pass it to editing
      if (!gridValues.find((cell) => cell.focused)) return
      if (gridValues.find((cell) => cell.focused).locked) return
      !isNaN(parseInt(key)) &&
        parseInt(key) !== 0 &&
        editCellState(
          gridValues.findIndex((cell) => cell.focused),
          isNoteMode ? 'annotation' : 'content',
          parseInt(key)
        )

      // check for deletion with backspace or suppr
      if (key === 'Backspace' || key === 'Delete') {
        editCellState(
          gridValues.findIndex((cell) => cell.focused),
          isNoteMode ? 'annotation' : 'content',
          null
        )
      }

      !isNoteMode &&
        cellUpdateKeyboard(gridValues.findIndex((cell) => cell.focused))
    }

    window.addEventListener('keydown', keyboardCallback)

    return () => {
      window.removeEventListener('keydown', keyboardCallback)
    }
  }, [editCellState, gridValues, isNoteMode, cellFocus, cellUpdateKeyboard])

  return (
    <StyledSudoku>
      <div className='head'>
        <span>Sudoku of </span>
        <input
          type='date'
          onChange={({ target }) =>
            setDateState(dateStringInputToApiFormat(target.value))
          }
          value={dateStringApiToInputFormat(dateState)}
        />
      </div>
      {loading ? (
        <div className='loader'>loading...</div>
      ) : error ? (
        <div className='error'>{error}</div>
      ) : (
        <table className='sudoku-table'>
          <tbody>
            {Array(9)
              .fill(null)
              .map((_, row) => (
                <tr key={row}>
                  {Array(9)
                    .fill(null)
                    .map((_, cell) => (
                      <td key={cell}>
                        <Cell
                          state={gridValues[row * 9 + cell]}
                          onClickHandler={() => cellFocus(row * 9 + cell)}
                        >
                          {gridValues[row * 9 + cell].content}
                        </Cell>
                      </td>
                    ))}
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <div className='buttons'>
        <button onClick={clearInputs} className='reset'>
          reset
        </button>
        <div className='right'>
          <div className='label'>Annotation mode :</div>
          <input
            onChange={({ target }) => setIsNoteMode(target.checked)}
            type='checkbox'
            name='note'
          />
        </div>
      </div>
    </StyledSudoku>
  )
}

export default Sudoku
