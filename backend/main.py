from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import json
from datetime import datetime

# Local imports
from database import db
from ai_agent import generate_execution_boundary
from armoriq_service import generate_intent_contract, verify_action_against_contract



# Coding agent tools (includes risk scores)
from tools.coding_tools import (
    read_codebase, modify_auth_module, run_tests, deploy_staging,
    push_to_production, drop_database, delete_records, access_customer_data,
    search_flights, search_hotels, create_itinerary, book_ticket, send_payment,
    read_files, write_report, TOOL_RISK_SCORES
)

app = FastAPI(
    title="Agent Black Box — Intent Firewall Engine",
    description="Cryptographic trust verification layer for autonomous AI agents",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Tool Registry ─────────────────────────────────────────────────────────────
TOOL_REGISTRY = {
    # Coding agent tools
    "read_codebase": read_codebase,
    "modify_auth_module": modify_auth_module,
    "run_tests": run_tests,
    "deploy_staging": deploy_staging,
    "push_to_production": push_to_production,
    "drop_database": drop_database,
    "delete_records": delete_records,
    "access_customer_data": access_customer_data,
    # Travel agent tools
    "search_flights": search_flights,
    "search_hotels": search_hotels,
    "create_itinerary": create_itinerary,
    "book_ticket": book_ticket,
    "send_payment": send_payment,
    # Generic
    "read_files": read_files,
    "write_report": write_report,
}

# High-risk threshold: actions with risk >= this value go to "pending_approval"
HIGH_RISK_THRESHOLD = 7


# ── Request / Response Models ─────────────────────────────────────────────────
class PlanRequest(BaseModel):
    user_input: str

class ExecuteRequest(BaseModel):
    plan_id: str
    tool_name: str
    arguments: dict = {}

class ApprovalRequest(BaseModel):
    action_id: str
    approve: bool
    reviewed_by: str = "human_operator"


# ── Helper: current timestamp ─────────────────────────────────────────────────
def _now() -> str:
    return datetime.utcnow().isoformat()


def _load_contract(raw_intent):
    if isinstance(raw_intent, str):
        return json.loads(raw_intent)
    if isinstance(raw_intent, dict):
        return raw_intent
    return {}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Agent Black Box — Intent Firewall Engine",
        "version": "2.0.0",
        "status": "operational",
        "armoriq": "active"
    }


@app.post("/plan")
@app.post("/create-plan")
async def create_plan(request: PlanRequest):
    """
    Step 1 of the ArmorIQ flow:
    Parse user intent → generate cryptographic intent contract → persist to DB.
    """
    # 1. Parse natural language → structured boundary via LLM
    structured_boundary = generate_execution_boundary(request.user_input)

    # 2. Wrap intent in cryptographic contract (hash + Merkle root + signature)
    contract = generate_intent_contract(
        structured_boundary["goal"],
        structured_boundary["allowed_actions"]
    )

    plan_id = str(uuid.uuid4())

    # 3. Persist plan to Supabase (or in-memory fallback)
    db.table("plans").insert({
        "id": plan_id,
        "user_id": "demo_hackathon_user",
        "goal": structured_boundary["goal"],
        "intent_hash": contract["intent_hash"],
        "merkle_root": contract["merkle_root"],
        "signature": contract["signature"],
        "agent_id": contract["agent_id"],
        "intent": json.dumps(contract),
        "status": "active",
        "created_at": _now()
    }).execute()

    return {
        "plan_id": plan_id,
        "contract": contract,
        "status": "signed"
    }


@app.post("/execute")
@app.post("/execute-action")
async def execute_action(request: ExecuteRequest):
    """
    Step 2 of the ArmorIQ flow:
    Verify tool call against signed intent contract → execute or block.
    Risk score determines: allowed / pending_approval / blocked.
    """
    # 1. Fetch intent contract
    plan_query = db.table("plans").select("intent").eq("id", request.plan_id).execute()
    if not plan_query.data:
        raise HTTPException(status_code=404, detail="Execution Contract Not Found")

    contract = _load_contract(plan_query.data[0]["intent"])

    # 2. ArmorIQ cryptographic boundary check
    is_authorized = verify_action_against_contract(request.tool_name, contract["allowed_actions"])
    risk_score = TOOL_RISK_SCORES.get(request.tool_name, 5)
    action_id = str(uuid.uuid4())
    ts = _now()

    if not is_authorized:
        # ── BLOCKED: Outside intent boundary ──────────────────────────────────
        db.table("blocked_actions").insert({
            "id": action_id,
            "plan_id": request.plan_id,
            "tool_name": request.tool_name,
            "status": "blocked",
            "risk_score": risk_score,
            "reason": "Outside Intent Boundary — Action not present in Signed Cryptographic Contract",
            "approved": False,
            "reviewed_by": None,
            "timestamp": ts
        }).execute()

        return {
            "status": "blocked",
            "action_id": action_id,
            "tool_name": request.tool_name,
            "risk_score": risk_score,
            "reason": "🔒 Security Boundary Breach: Tool absent from ArmorIQ Signed Intent Block",
            "timestamp": ts
        }

    # 3. High-risk authorized action → pending human approval
    if risk_score >= HIGH_RISK_THRESHOLD:
        db.table("blocked_actions").insert({
            "id": action_id,
            "plan_id": request.plan_id,
            "tool_name": request.tool_name,
            "status": "pending_approval",
            "risk_score": risk_score,
            "reason": f"High-risk action (score: {risk_score}/10) — requires human approval before execution",
            "approved": None,
            "reviewed_by": None,
            "timestamp": ts
        }).execute()

        return {
            "status": "pending_approval",
            "action_id": action_id,
            "tool_name": request.tool_name,
            "risk_score": risk_score,
            "reason": f"⚠️ High-risk action requires human authorization (risk: {risk_score}/10)",
            "timestamp": ts
        }

    # 4. Authorized + low-enough risk → execute
    tool_func = TOOL_REGISTRY.get(request.tool_name)
    if not tool_func:
        raise HTTPException(status_code=400, detail="Tool missing from registry")

    arg_value = next(iter(request.arguments.values())) if request.arguments else "default"
    execution_result = tool_func(arg_value)

    db.table("executions").insert({
        "id": action_id,
        "plan_id": request.plan_id,
        "tool_name": request.tool_name,
        "status": "allowed",
        "risk_score": risk_score,
        "result": execution_result,
        "timestamp": ts
    }).execute()

    return {
        "status": "allowed",
        "action_id": action_id,
        "tool_name": request.tool_name,
        "risk_score": risk_score,
        "result": execution_result,
        "timestamp": ts
    }


@app.get("/logs/{plan_id}")
@app.get("/audit-logs/{plan_id}")
async def get_audit_logs(plan_id: str):
    """Full audit trail: all executions + blocked/pending actions for a plan."""
    executions = db.table("executions").select("*").eq("plan_id", plan_id).order("timestamp").execute()
    blocked = db.table("blocked_actions").select("*").eq("plan_id", plan_id).order("timestamp").execute()
    return {
        "plan_id": plan_id,
        "executions": executions.data,
        "blocked_actions": blocked.data,
        "total_events": len(executions.data) + len(blocked.data)
    }


@app.get("/execution-timeline/{plan_id}")
async def get_execution_timeline(plan_id: str):
    """Chronological merged timeline of all events for a plan."""
    executions = db.table("executions").select("*").eq("plan_id", plan_id).order("timestamp").execute()
    blocked = db.table("blocked_actions").select("*").eq("plan_id", plan_id).order("timestamp").execute()

    timeline = []
    for e in executions.data:
        timeline.append({**e, "event_type": "execution"})
    for b in blocked.data:
        timeline.append({**b, "event_type": "blocked"})

    timeline.sort(key=lambda x: x.get("timestamp", ""))
    return {"plan_id": plan_id, "timeline": timeline}


@app.get("/intent-details/{plan_id}")
async def get_intent_details(plan_id: str):
    """Retrieve the full signed intent contract for a plan."""
    plan_query = db.table("plans").select("*").eq("id", plan_id).execute()
    if not plan_query.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = plan_query.data[0]
    contract = _load_contract(plan.get("intent", "{}"))
    return {"plan_id": plan_id, "plan": plan, "contract": contract}


@app.post("/approve")
@app.post("/approve-action")
async def approve_action(request: ApprovalRequest):
    """Human-in-the-loop: approve or reject a pending/blocked action."""
    decision = "approved" if request.approve else "rejected"
    db.table("blocked_actions").update({
        "approved": request.approve,
        "status": decision,
        "reviewed_by": request.reviewed_by,
        "reviewed_at": _now()
    }).eq("id", request.action_id).execute()

    db.table("approvals").insert({
        "id": str(uuid.uuid4()),
        "action_id": request.action_id,
        "decision": decision,
        "reviewed_by": request.reviewed_by,
        "reviewed_at": _now()
    }).execute()

    return {
        "status": "updated",
        "action_id": request.action_id,
        "decision": decision,
        "reviewed_by": request.reviewed_by
    }


@app.get("/risk-scores")
async def get_risk_scores():
    """Return the static risk score registry."""
    return {"risk_scores": TOOL_RISK_SCORES, "high_risk_threshold": HIGH_RISK_THRESHOLD}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": _now(), "armoriq_version": "2.0.0"}
