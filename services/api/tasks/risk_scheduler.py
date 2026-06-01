"""
TradeNexus CTRM — Background Risk Assessment Scheduler.

Uses APScheduler to execute the Risk Agent analysis hourly and after startup delays.
"""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.database import get_client
from agents.risk_agent import RiskAgent

logger = logging.getLogger("risk_scheduler")
logger.setLevel(logging.INFO)

scheduler = AsyncIOScheduler()


async def run_risk_cycle():
    """Execute the full risk agent analysis cycle."""
    logger.info("Risk scheduler: starting background risk analysis cycle...")
    try:
        sb = get_client()
        risk_agent = RiskAgent(supabase_client=sb)
        result = await risk_agent.run_full_cycle()
        logger.info("Risk scheduler: background analysis completed: %s", result)
    except Exception as e:
        logger.error("Risk scheduler: error during background cycle: %s", e, exc_info=True)


async def run_delayed_startup():
    """Wait 30 seconds after startup, then run risk cycle once."""
    logger.info("Risk scheduler: waiting 30 seconds before initial startup run...")
    await asyncio.sleep(30)
    logger.info("Risk scheduler: executing initial startup risk cycle...")
    await run_risk_cycle()


def start_scheduler():
    """Start the APScheduler background daemon and register interval job."""
    # 1. Register hourly interval job
    scheduler.add_job(
        run_risk_cycle,
        "interval",
        hours=1,
        id="risk_hourly_job",
        replace_existing=True,
    )

    # 2. Start scheduler
    scheduler.start()
    logger.info("Risk scheduler: APScheduler started successfully.")

    # 3. Schedule the run-once startup analysis (asynchronous background task)
    asyncio.create_task(run_delayed_startup())


def shutdown_scheduler():
    """Shutdown background APScheduler thread cleanly on server exit."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Risk scheduler: APScheduler stopped.")
