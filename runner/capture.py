#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

FIXED_DATE = "2025-01-02T03:04:05+00:00"
HOME_ALIAS = "~"


def load_steps(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("steps"), list) or not data["steps"]:
        raise ValueError("steps.json precisa de uma lista 'steps' com pelo menos um passo")
    seen: set[str] = set()
    for index, step in enumerate(data["steps"]):
        if not isinstance(step.get("command"), str) or not step["command"]:
            raise ValueError(f"passo {index} precisa de 'command'")
        if not isinstance(step.get("id"), str) or step["id"] in seen:
            raise ValueError(f"passo {index} precisa de um 'id' único")
        if not isinstance(step.get("wait"), (int, float)) or step["wait"] <= 0:
            raise ValueError(f"passo {step['id']} precisa de 'wait' em segundos")
        seen.add(step["id"])
    return data


def controlled_environment(home: Path, columns: int) -> dict[str, str]:
    return {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "HOME": str(home),
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "TERM": "xterm-256color",
        "COLUMNS": str(columns),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_AUTHOR_DATE": FIXED_DATE,
        "GIT_COMMITTER_DATE": FIXED_DATE,
    }


def configure_git(env: dict[str, str]) -> None:
    settings = [
        ("init.defaultBranch", "main"),
        ("user.name", "Aluno"),
        ("user.email", "aluno@example.com"),
        ("color.ui", "always"),
        ("color.status", "always"),
        ("color.branch", "always"),
        ("color.decorate", "always"),
        ("core.pager", "cat"),
    ]
    for key, value in settings:
        subprocess.run(["git", "config", "--global", key, value], env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def tool_version(args: list[str]) -> str:
    try:
        return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False, text=True).stdout.strip().splitlines()[0]
    except (OSError, IndexError):
        return "desconhecido"


def run(steps_path: Path, work_root: Path, output_path: Path) -> None:
    spec = load_steps(steps_path)
    repo_name = str(spec.get("repo_name", "laboratorio"))
    columns = int(spec.get("terminal_columns", 60))
    repo = (work_root / repo_name).resolve()
    if repo.parent != work_root.resolve():
        raise ValueError("repo_name precisa ser um nome simples de pasta")

    shutil.rmtree(repo, ignore_errors=True)
    repo.mkdir(parents=True)
    home = work_root / ".runner-home"
    shutil.rmtree(home, ignore_errors=True)
    home.mkdir(parents=True)
    env = controlled_environment(home, columns)
    configure_git(env)
    alias_from = str(work_root.resolve())

    captured: list[dict[str, Any]] = []
    for index, source_step in enumerate(spec["steps"]):
        step = dict(source_step)
        expected_exit = int(step.pop("expected_exit", 0))
        command = step["command"]
        try:
            result = subprocess.run(["bash", "--noprofile", "--norc", "-c", command], cwd=repo, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False, timeout=60)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError(f"passo {step['id']!r} passou de 60 s: {command}") from error
        stdout = result.stdout.decode("utf-8", errors="replace").replace(alias_from, HOME_ALIAS)
        stderr = result.stderr.decode("utf-8", errors="replace").replace(alias_from, HOME_ALIAS)
        record = {"index": index, **step, "cwd": repo_name, "stdout": stdout, "stderr": stderr, "exit_code": result.returncode, "expected_exit": expected_exit}
        captured.append(record)
        if result.returncode != expected_exit:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps({"schema_version": 1, "partial": True, "steps": captured}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            raise RuntimeError(f"passo {step['id']!r} saiu com {result.returncode}; esperado {expected_exit}; stderr={stderr!r}")

    transcript = {
        "schema_version": 1,
        "repo_name": repo_name,
        "locale": "C",
        "terminal": {"term": "xterm-256color", "columns": columns},
        "tool_versions": {"git": tool_version(["git", "--version"]), "bash": tool_version(["bash", "--version"])},
        "git": {"user_name": "Aluno", "user_email": "aluno@example.com", "author_date": FIXED_DATE, "committer_date": FIXED_DATE, "init_default_branch": "main", "color_ui": "always"},
        "steps": captured,
    }
    text = json.dumps(transcript, ensure_ascii=False, indent=2) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    print(f"capturados {len(captured)} passos em {output_path} (sha256 {digest[:12]})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Executa os passos de steps.json em um repositório descartável e grava a saída real em transcript.json")
    parser.add_argument("steps", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--work-root", type=Path, required=True)
    args = parser.parse_args()
    run(args.steps.resolve(), args.work_root.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
