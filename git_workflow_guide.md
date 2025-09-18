# Modern Git Workflow Guide: Branching, Worktrees, and Rebasing

This guide explains efficient Git workflows for managing parallel development, using `dev-ui` as the base branch and `dev-cli-tool` as the feature branch.

## The Scenario

You are working on a new feature (`dev-cli-tool`) that is based on an existing development branch (`dev-ui`). You need to be able to work on your feature while periodically incorporating the latest updates from `dev-ui`.

---

## 1. Switching Between Branches (The Traditional Method)

This method uses a single working directory and `git checkout` to switch between the branches.

### Pros & Cons

*   **Pro:** Simple concept, uses basic commands.
*   **Con:** Inefficient. You must stop what you're doing, stash or commit, and wait for the checkout. This breaks your development flow.

---

## 2. Switching Between Worktrees (The Modern Method)

This method uses `git worktree` to create separate directories for each branch, allowing you to work on them simultaneously.

### Pros & Cons

*   **Pro:** Extremely efficient. Allows for true parallel work, testing, and building on different branches.
*   **Con:** Uses slightly more disk space.

---

## 3. Keeping Your Branch Updated with `git rebase`

Whether you use traditional switching or `git worktree`, `rebase` is the best way to incorporate changes from the base branch into your feature branch.

---

## 4. Other Related Information

### The Golden Rule of Rebasing

**NEVER rebase a public or shared branch** (like `main` or `develop`). Rebasing rewrites commit history, which can cause major problems for anyone else who has pulled that branch. It is safe to rebase your own local feature branches.

### Pushing a Rebased Branch

Because rebase rewrites history, you must use `--force-with-lease` when pushing.

```bash
# Safely force-push your rebased branch
git push origin dev-cli-tool --force-with-lease
```

### Cleaning Up a Worktree

When your feature is complete and merged, you can remove the worktree.

```bash
# From the main project directory (NOT inside the worktree)
git worktree remove ./dev-cli-tool
```

---
## 5. Q&A: Common Worktree Questions

### Q: Does `cd` become my new branch switcher?

**A: Yes, effectively.** When using worktrees, you stop using `git checkout <branch>` to switch. Instead, you use `cd <directory>` to move between your worktree folders. It's faster and doesn't require stashing changes.

### Q: If I don't rebase, do my branches get updates automatically?

**A: No, they do not.** Your branches are completely isolated. You must explicitly run `git rebase` (or `git merge`) to bring changes from one branch to another.

### Q: How do I move a file from one worktree (branch) to another?

**A: "Moving" a file between branches means committing it to one branch and then getting that commit onto the other branch.** Here are two common ways to do it.

**Method 1: `git cherry-pick` (Recommended)**

This is the most precise, Git-native way. It copies a specific commit from one branch and applies it to another.

1.  **Commit the file** in its original branch (e.g., `dev-ui`).
    ```bash
    # In the dev-ui worktree...
    git add my_new_file.txt
    git commit -m "feat: add my_new_file"

    # Find the commit hash (ID)
    git log -1
    # (Copy the commit hash, it will look something like a1b2c3d4)
    ```
2.  **Cherry-pick the commit** into the target branch (e.g., `dev-cli-tool`).
    ```bash
    # In the dev-cli-tool worktree...
    git cherry-pick <commit-hash-you-copied>
    # (e.g., git cherry-pick a1b2c3d4)
    ```
    The file now exists and is committed in the `dev-cli-tool` branch as well.

**Method 2: Manual Copy**

This is simpler for one-off files and doesn't require thinking about commit hashes.

1.  **Copy the file** from one worktree directory to the other using your computer's file explorer or `cp` command.
2.  **Commit the copied file** in the destination branch.
    ```bash
    # In the dev-cli-tool worktree...
    git add my_new_file.txt
    git commit -m "feat: add my_new_file"
    ```

### Q: Does each worktree only belong to one branch?

**A: Yes, exactly.** Each worktree has a one-to-one relationship with a branch. You cannot have the same branch checked out in two different worktrees at the same time.

### Q: How do I switch between worktrees?

**A: You don't use a `git` command. You just change directories (`cd`) or switch editor windows.**

#### In the Command Line:

To switch from the `dev-ui` worktree to the `dev-cli-tool` worktree, simply do:
```bash
cd dev-cli-tool
```
To switch back, go up one level:
```bash
cd ..
```

#### In VS Code (or other editors):

The best practice is to open each worktree folder in its own **separate editor window**.

### Q: Are my changes in a worktree isolated?

**A: Yes, completely.** All your actions—file edits, commits, rebases—apply *only* to the branch checked out in that worktree.