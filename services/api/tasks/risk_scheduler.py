"""
TradeNexus CTRM — Background Risk Assessment Scheduler.

Uses APScheduler to execute the Risk Agent analysis hourly and after startup delays.
Also triggers daily weather risk scans and macro sentiment analysis.
"""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.database import get_client
from agents.risk_agent import RiskAgent
from agents.weather_agent import WeatherAgent
from agents.macro_signal_agent import MacroSignalAgent

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


async def run_weather_scan():
    """Execute the daily weather risk scan."""
    logger.info("Risk scheduler: starting background weather risk scan...")
    try:
        sb = get_client()
        weather_agent = WeatherAgent(supabase_client=sb)
        result = await weather_agent.run_daily_scan()
        logger.info("Risk scheduler: weather risk scan completed: %s", result)
    except Exception as e:
        logger.error("Risk scheduler: error during weather scan: %s", e, exc_info=True)


async def run_macro_analysis():
    """Execute the daily macro sentiment analysis."""
    logger.info("Risk scheduler: starting background macro sentiment analysis...")
    try:
        sb = get_client()
        from core.llm_provider import get_llm_provider
        llm_provider = get_llm_provider()
        macro_agent = MacroSignalAgent(supabase_client=sb, llm_provider=llm_provider)
        result = await macro_agent.run_daily_analysis()
        logger.info("Risk scheduler: macro sentiment analysis completed: %s", result)
    except Exception as e:
        logger.error("Risk scheduler: error during macro analysis: %s", e, exc_info=True)


async def run_delayed_startup():
    """Wait 30 seconds after startup, then run risk cycle once."""
    logger.info("Risk scheduler: waiting 30 seconds before initial startup run...")
    await asyncio.sleep(30)
    logger.info("Risk scheduler: executing initial startup risk cycle...")
    await run_risk_cycle()


def start_scheduler():
    """Start the APScheduler background daemon and register interval + cron jobs."""
    # 1. Register hourly interval job
    scheduler.add_job(
        run_risk_cycle,
        "interval",
        hours=1,
        id="risk_hourly_job",
        replace_existing=True,
    )

    # 2. Register Weather scan: daily at 7:00 AM IST
    scheduler.add_job(
        run_weather_scan,
        "cron",
        hour=7,
        minute=0,
        timezone="Asia/Kolkata",
        id="weather_daily_scan",
        replace_existing=True,
    )

    # 3. Register Macro sentiment: daily at 8:00 AM IST
    scheduler.add_job(
        run_macro_analysis,
        "cron",
        hour=8,
        minute=0,
        timezone="Asia/Kolkata",
        id="macro_daily_analysis",
        replace_existing=True,
    )

    # 4. Start scheduler
    scheduler.start()
    logger.info("Risk scheduler: APScheduler started successfully.")

    # 5. Schedule the run-once startup analysis (asynchronous background task)
    asyncio.create_task(run_delayed_startup())


def shutdown_scheduler():
    """Shutdown background APScheduler thread cleanly on server exit."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Risk scheduler: APScheduler stopped.")

