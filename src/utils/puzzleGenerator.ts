export function generateMathPuzzle(difficulty: 'easy' | 'medium' | 'hard') {
  const ranges = {
    easy: { min: 1, max: 20 },
    medium: { min: 10, max: 50 },
    hard: { min: 20, max: 100 }
  };
  
  const range = ranges[difficulty];
  const a = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const b = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  let question: string;
  let answer: number;
  
  if (difficulty === 'hard') {
    // Include multiplication and division for hard mode
    const operations = ['+', '-', '*', '/'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    switch (operation) {
      case '+':
        answer = a + b;
        question = `${a} + ${b}`;
        break;
      case '-':
        answer = a - b;
        question = `${a} - ${b}`;
        break;
      case '*':
        const smallA = Math.floor(Math.random() * 12) + 2;
        const smallB = Math.floor(Math.random() * 12) + 2;
        answer = smallA * smallB;
        question = `${smallA} × ${smallB}`;
        break;
      case '/':
        const dividend = a * b;
        answer = a;
        question = `${dividend} ÷ ${b}`;
        break;
      default:
        answer = a + b;
        question = `${a} + ${b}`;
    }
  } else {
    // Easy and medium: only addition and subtraction
    const operation = Math.random() < 0.5 ? '+' : '-';
    if (operation === '+') {
      answer = a + b;
      question = `${a} + ${b}`;
    } else {
      // Ensure positive result for subtraction
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      answer = larger - smaller;
      question = `${larger} - ${smaller}`;
    }
  }
  
  return {
    question: `${question} = ?`,
    answer: answer.toString(),
  };
}

export function generatePatternPuzzle(difficulty: 'easy' | 'medium' | 'hard') {
  const size = 16; // 4x4 grid
  const pattern = Array(size).fill(false);
  
  const numActive = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  
  // Generate a pattern with some logic
  const positions = new Set<number>();
  
  if (difficulty === 'easy') {
    // Simple patterns: corners, edges, or center
    const patterns = [
      [0, 3, 12, 15], // corners
      [5, 6, 9, 10], // center square
      [1, 2, 4, 7], // L shape
    ];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    selectedPattern.forEach(pos => positions.add(pos));
  } else {
    // More complex random patterns
    while (positions.size < numActive) {
      positions.add(Math.floor(Math.random() * size));
    }
  }
  
  positions.forEach(pos => {
    pattern[pos] = true;
  });
  
  return {
    question: "Recreate this pattern",
    answer: pattern,
    targetPattern: pattern,
  };
}
