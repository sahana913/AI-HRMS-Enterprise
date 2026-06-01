from services.interview_service import schedule_interview, list_interviews, update_interview


async def create_interview(payload: dict):
    return await schedule_interview(payload)


async def get_interviews():
    return await list_interviews()


async def revise_interview(interview_id: str, payload: dict):
    return await update_interview(interview_id, payload)
