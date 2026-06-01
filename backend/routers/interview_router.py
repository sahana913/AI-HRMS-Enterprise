from fastapi import APIRouter, Depends
from controllers.interview_controller import create_interview, get_interviews, revise_interview
from middleware.auth import require_permission

router = APIRouter()


@router.post("/schedule")
async def schedule_interview(payload: dict, user: dict = Depends(require_permission("interviews:manage"))):
    return await create_interview(payload)


@router.get("/list")
async def list_interviews(user: dict = Depends(require_permission("interviews:manage"))):
    return await get_interviews()


@router.patch("/{interview_id}")
async def update_interview(interview_id: str, payload: dict, user: dict = Depends(require_permission("interviews:manage"))):
    return await revise_interview(interview_id, payload)
