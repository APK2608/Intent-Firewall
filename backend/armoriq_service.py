import hashlib
import json
from datetime import datetime


def _compute_merkle_root(actions: list[str]) -> str:
    """
    Computes a simplified Merkle root over the allowed_actions list.
    Each leaf is the SHA-256 hash of an action name.
    Pairs are hashed together level by level until one root remains.
    """
    if not actions:
        return hashlib.sha256(b"empty").hexdigest()

    # Leaf hashes
    leaves = [hashlib.sha256(a.encode()).hexdigest() for a in sorted(actions)]

    # Build Merkle tree level by level
    level = leaves
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left  # duplicate last if odd
            combined = hashlib.sha256((left + right).encode()).hexdigest()
            next_level.append(combined)
        level = next_level

    return level[0]


def generate_intent_contract(goal: str, allowed_actions: list) -> dict:
    """
    Simulates the core ArmorIQ SDK behavior:
    Hashes the original agent constraints into an immutable cryptographic contract.
    Includes Intent Hash, Merkle Root, and Execution Signature.
    """
    timestamp = datetime.utcnow().isoformat()
    sorted_actions = sorted(allowed_actions)

    intent_payload = {
        "goal": goal,
        "allowed_actions": sorted_actions,
        "timestamp": timestamp,
    }

    # Serialize cleanly to guarantee identical hash calculation
    serialized = json.dumps(intent_payload, separators=(',', ':'), sort_keys=True)
    intent_hash = hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    merkle_root = _compute_merkle_root(sorted_actions)

    # Derive agent identity fingerprint from hash
    agent_id = f"agent_{intent_hash[:8]}"
    signature = f"armoriq_v2_sig_{intent_hash[:16]}_{merkle_root[:8]}"

    return {
        "intent_hash": intent_hash,
        "merkle_root": merkle_root,
        "signature": signature,
        "agent_id": agent_id,
        "allowed_actions": allowed_actions,
        "goal": goal,
        "created_at": timestamp,
        "version": "ArmorIQ-v2.0",
    }


def verify_action_against_contract(attempted_action: str, allowed_actions: list) -> bool:
    """
    Evaluates whether the executing engine action resides safely within
    the boundaries cryptographically signed in the original intent contract.
    """
    return attempted_action in allowed_actions