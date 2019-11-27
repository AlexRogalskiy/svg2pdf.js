import { Fill, FillData } from './Fill'
import { Context } from '../context/context'
import { parseTransform } from '../utils/transform'
import { getAttribute } from '../utils/node'
import { Pattern } from '../nodes/pattern'
import { Rect } from '../utils/geometry'
import { GraphicsNode } from '../nodes/graphicsnode'

export class PatternFill implements Fill {
  private readonly key: string
  private readonly pattern: Pattern

  constructor(key: string, pattern: Pattern) {
    this.key = key
    this.pattern = pattern
  }

  getFillData(forNode: GraphicsNode, context: Context): FillData | undefined {
    const patternOrGradient: PatternData = {
      key: this.key,
      boundingBox: undefined,
      xStep: 0,
      yStep: 0,
      matrix: undefined
    }

    let bBox
    let patternUnitsMatrix = context.pdf.unitMatrix
    if (
      !this.pattern.element.hasAttribute('patternUnits') ||
      this.pattern.element.getAttribute('patternUnits').toLowerCase() === 'objectboundingbox'
    ) {
      bBox = forNode.getBBox(context)
      patternUnitsMatrix = new context.pdf.Matrix(1, 0, 0, 1, bBox[0], bBox[1])

      // TODO: slightly inaccurate (rounding errors? line width bBoxes?)
      const fillBBox = this.pattern.getBBox(context)
      const x = fillBBox[0] * bBox[0]
      const y = fillBBox[1] * bBox[1]
      const width = fillBBox[2] * bBox[2]
      const height = fillBBox[3] * bBox[3]
      patternOrGradient.boundingBox = [x, y, x + width, y + height]
      patternOrGradient.xStep = width
      patternOrGradient.yStep = height
    }

    let patternContentUnitsMatrix = context.pdf.unitMatrix
    if (
      this.pattern.element.hasAttribute('patternContentUnits') &&
      this.pattern.element.getAttribute('patternContentUnits').toLowerCase() === 'objectboundingbox'
    ) {
      bBox || (bBox = forNode.getBBox(context))
      patternContentUnitsMatrix = new context.pdf.Matrix(bBox[2], 0, 0, bBox[3], 0, 0)

      const fillBBox = patternOrGradient.boundingBox || this.pattern.getBBox(context)
      const x = fillBBox[0] / bBox[0]
      const y = fillBBox[1] / bBox[1]
      const width = fillBBox[2] / bBox[2]
      const height = fillBBox[3] / bBox[3]
      patternOrGradient.boundingBox = [x, y, x + width, y + height]
      patternOrGradient.xStep = width
      patternOrGradient.yStep = height
    }

    let patternTransformMatrix = context.pdf.unitMatrix
    if (this.pattern.element.hasAttribute('patternTransform')) {
      patternTransformMatrix = parseTransform(
        getAttribute(this.pattern.element, 'patternTransform', 'transform'),
        context
      )
    }

    let matrix = patternContentUnitsMatrix
    matrix = context.pdf.matrixMult(matrix, patternUnitsMatrix)
    matrix = context.pdf.matrixMult(matrix, patternTransformMatrix)
    matrix = context.pdf.matrixMult(matrix, context.transform)

    patternOrGradient.matrix = matrix

    return patternOrGradient
  }
}

interface PatternData {
  key: string
  boundingBox: Rect
  xStep: number
  yStep: number
  matrix: any
}
