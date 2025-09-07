#!/usr/bin/env bash
# Common functions and variables for all scripts

# get_repo_root outputs the Git repository root directory (the path returned by `git rev-parse --show-toplevel`).
get_repo_root() {
    git rev-parse --show-toplevel
}

# get_current_branch returns the current Git branch name as reported by `git rev-parse --abbrev-ref HEAD`.
get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

# Check if current branch is a feature branch
# check_feature_branch verifies that the given branch name follows the feature-branch pattern `NNN-name` (three digits, a hyphen, then the feature name). It prints an error and returns 1 on mismatch, returns 0 when valid (parameter: branch name).
check_feature_branch() {
    local branch="$1"
    if [[ ! "$branch" =~ ^[0-9]{3}- ]]; then
        echo "ERROR: Not on a feature branch. Current branch: $branch"
        echo "Feature branches should be named like: 001-feature-name"
        return 1
    fi
    return 0
}

# get_feature_dir returns the path to a feature's specs directory inside the repo (i.e. "$repo_root/specs/$branch").
get_feature_dir() {
    local repo_root="$1"
    local branch="$2"
    echo "$repo_root/specs/$branch"
}

# Get all standard paths for a feature
# Usage: eval $(get_feature_paths)
# get_feature_paths prints shell assignments for feature-related paths (REPO_ROOT, CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS, RESEARCH, DATA_MODEL, QUICKSTART, CONTRACTS_DIR).
# The output is intended to be evaluated (e.g., `eval $(get_feature_paths)`) so calling code receives those variables set for the current repository and branch.
get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    local feature_dir=$(get_feature_dir "$repo_root" "$current_branch")
    
    echo "REPO_ROOT='$repo_root'"
    echo "CURRENT_BRANCH='$current_branch'"
    echo "FEATURE_DIR='$feature_dir'"
    echo "FEATURE_SPEC='$feature_dir/spec.md'"
    echo "IMPL_PLAN='$feature_dir/plan.md'"
    echo "TASKS='$feature_dir/tasks.md'"
    echo "RESEARCH='$feature_dir/research.md'"
    echo "DATA_MODEL='$feature_dir/data-model.md'"
    echo "QUICKSTART='$feature_dir/quickstart.md'"
    echo "CONTRACTS_DIR='$feature_dir/contracts'"
}

# check_file checks whether the given file exists and prints a status line ("✓" on success, "✗" on failure) with the provided description; returns 0 if the file exists, 1 otherwise.
check_file() {
    local file="$1"
    local description="$2"
    if [[ -f "$file" ]]; then
        echo "  ✓ $description"
        return 0
    else
        echo "  ✗ $description"
        return 1
    fi
}

# check_dir checks that a directory exists and contains at least one entry; it prints a checkmark or cross prefixed by the provided description and returns 0 on success or 1 on failure.
check_dir() {
    local dir="$1"
    local description="$2"
    if [[ -d "$dir" ]] && [[ -n "$(ls -A "$dir" 2>/dev/null)" ]]; then
        echo "  ✓ $description"
        return 0
    else
        echo "  ✗ $description"
        return 1
    fi
}