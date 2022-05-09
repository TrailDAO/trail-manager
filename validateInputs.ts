const validateInputs = (circuitRequiredInputs: any, inputs: any) => {
  const requiredInputs = Object.getOwnPropertyNames(circuitRequiredInputs)

  const filterFunc = (requiredInput: string) => {
    if (!inputs[requiredInput]) {
      return true
    }

    const requiredType = circuitRequiredInputs[requiredInput]
    const inputType = typeof inputs[requiredInput]
    if (requiredType !== inputType) {
      return true
    }

    return false
  }

  const badInputs = requiredInputs.filter(filterFunc)
  return badInputs
}

export default validateInputs
