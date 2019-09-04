import { Editor, Code, ErrorReason } from "../../editor/editor";
import { Selection } from "../../editor/selection";
import { InMemoryEditor } from "../../editor/adapters/in-memory-editor";
import { testEach } from "../../tests-helpers";

import { mergeIfStatements } from "./merge-if-statements";

describe("Split If Statement", () => {
  let showErrorMessage: Editor["showError"];

  beforeEach(() => {
    showErrorMessage = jest.fn();
  });

  testEach<{ code: Code; selection?: Selection; expected: Code }>(
    "should merge if statements",
    [
      {
        description: "basic scenario",
        code: `if (isValid) {
  if (isCorrect) {
    doSomething();
  }
}`,
        expected: `if (isValid && isCorrect) {
  doSomething();
}`
      },
      {
        description: "without block statements",
        code: `if (isValid)
  if (isCorrect)
    doSomething();`,
        expected: `if (isValid && isCorrect) {
  doSomething();
}`
      },
      {
        description: "nested if statements, cursor on wrapper",
        code: `if (isValid) {
  if (isCorrect) {
    if (shouldDoSomething) {
      doSomething();
    }
  }
}`,
        selection: Selection.cursorAt(0, 4),
        expected: `if (isValid && isCorrect) {
  if (shouldDoSomething) {
    doSomething();
  }
}`
      },
      {
        description: "nested if statements, cursor on nested",
        code: `if (isValid) {
  if (isCorrect) {
    if (shouldDoSomething) {
      doSomething();
    }
  }
}`,
        selection: Selection.cursorAt(1, 6),
        expected: `if (isValid) {
  if (isCorrect && shouldDoSomething) {
    doSomething();
  }
}`
      },
      {
        description: "nested if statements, cursor on deepest nested",
        code: `if (isValid) {
  if (isCorrect) {
    if (shouldDoSomething) {
      doSomething();
    }
  }
}`,
        selection: Selection.cursorAt(2, 8),
        expected: `if (isValid) {
  if (isCorrect && shouldDoSomething) {
    doSomething();
  }
}`
      },
      {
        description:
          "nested if statements, cursor on nested, deepest nested has an alternate node",
        code: `if (isValid) {
  if (isCorrect) {
    if (shouldDoSomething) {
      doSomething();
    } else {
      doAnotherThing();
    }
  }
}`,
        selection: Selection.cursorAt(2, 8),
        expected: `if (isValid && isCorrect) {
  if (shouldDoSomething) {
    doSomething();
  } else {
    doAnotherThing();
  }
}`
      },
      {
        description: "nested if statement in else, cursor on nested",
        code: `if (isValid) {
  doSomething();
} else {
  if (isCorrect) {
    doAnotherThing();
  }
}`,
        selection: Selection.cursorAt(3, 6),
        expected: `if (isValid) {
  doSomething();
} else if (isCorrect) {
  doAnotherThing();
}`
      },
      {
        description: "nested if-else statement in else, cursor on nested",
        code: `if (isValid) {
  doSomething();
} else {
  if (isCorrect) {
    doAnotherThing();
  } else {
    doNothing();
  }
}`,
        selection: Selection.cursorAt(3, 6),
        expected: `if (isValid) {
  doSomething();
} else if (isCorrect) {
  doAnotherThing();
} else {
  doNothing();
}`
      }
    ],
    async ({ code, selection = Selection.cursorAt(0, 0), expected }) => {
      const result = await doMergeIfStatements(code, selection);

      expect(result).toBe(expected);
    }
  );

  testEach<{ code: Code }>(
    "should not merge if statements",
    [
      {
        description: "nested if has an alternate node",
        code: `if (isValid) {
  if (isCorrect) {
    doSomething();
  } else {
    doAnotherThing();
  }
}`
      },
      {
        description: "wrapping if has an alternate node",
        code: `if (isValid) {
  if (isCorrect) {
    doSomething();
  }
} else {
  doAnotherThing();
}`
      },
      {
        description: "nested if has a sibling node",
        code: `if (isValid) {
  if (isCorrect) {
    doSomething();
  }

  doAnotherThing();
}`
      }
    ],
    async ({ code }) => {
      const selection = Selection.cursorAt(0, 0);

      const result = await doMergeIfStatements(code, selection);

      expect(result).toBe(code);
    }
  );

  it("should throw an error if there is nothing to merge", async () => {
    const code = `if (isValid) {}`;
    const selection = Selection.cursorAt(0, 4);

    await doMergeIfStatements(code, selection);

    expect(showErrorMessage).toBeCalledWith(
      ErrorReason.DidNotFoundIfStatementsToMerge
    );
  });

  async function doMergeIfStatements(
    code: Code,
    selection: Selection
  ): Promise<Code> {
    const editor = new InMemoryEditor(code);
    editor.showError = showErrorMessage;
    await mergeIfStatements(code, selection, editor);
    return editor.code;
  }
});
