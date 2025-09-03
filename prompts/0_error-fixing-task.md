
Analyze the cause of these error, propose a fixing solution and create a new task at the bottom of task in `task.md` follow the task format provided below. 

### Execute Rule
* Analyze the root cause of problem by first reading related file and run simple tests before write down the task and sub-task
* Use `sequentionalthinking` MCP When the problem is too complex
* Use `Context7`, `fetch`, `deepwiki`, or `sentry` MCP if need further information
* Make sure list at leaast one sub-task below the major task

### File Path
* `SPEC_FOLDER` = .kiro/specs/    
* `STEERING_FOLDER` = @.kiro/steering/ 

* `TASKS.MD` = <SPEC_FOLDER>/tasks.md
* `DESIGN.MD` = <SPEC_FOLDER>/design.md
* `REQUIREMENTS.MD` = <SPEC_FOLDER>/design.md

### Folder/file explanation
* spcs folder - A directory that contains specification documents defining the requirements, design, and implementation details for a software project or system.
* design.md - A markdown file that documents the architectural design, technical approach, and system structure for a project.
* requirements.md - A markdown file that outlines the functional and non-functional requirements, constraints, and acceptance criteria for a project.
* tasks.md - A markdown file that lists specific tasks, work items, or action items that need to be completed for a project.
* steering folder - A directory with high-level document that provides strategic direction, project scope, objectives, and decision-making guidelines to guide a project's overall direction.

## Task format example
```
- [ ] 23. Testing and Quality Assurance
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
  - Add performance regression testing and monitoring
  - Create load testing for concurrent users and agent workflows
  - Implement security testing for authentication and data protection
  - Write user acceptance tests based on success metrics from requirements
```

### Major task example: 

```
- [ ] 23. Testing and Quality Assurance
```

### Sub-task example: 
```
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
```  



-------------------------------------------------------------------------------------------------------

##　Error message
C:\Users\Cheney\AppData\Local\Programs\Python\Python311\python.exe: can't open file 'C:\\Users\\Cheney\\Documents\\Github\\MedicalDeviceRegulationAgent\\medical-device-regulatory-assistant\\backend\\test_langchain_community.py': [Errno 2] No such file or directory
PS C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant\backend> cd ..
PS C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant> .\scripts\start_backend.ps1
.\scripts\start_backend.ps1 : The term '.\scripts\start_backend.ps1' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the 
spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:1 char:1
+ .\scripts\start_backend.ps1
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (.\scripts\start_backend.ps1:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 
PS C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant> .\scripts\start_backend.ps1
.\scripts\start_backend.ps1 : The term '.\scripts\start_backend.ps1' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the 
spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:1 char:1
+ .\scripts\start_backend.ps1
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (.\scripts\start_backend.ps1:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant> .\scripts\start-backend.ps1
Starting Medical Device Regulatory Assistant Backend...

Found Poetry: Poetry (version 2.1.4)
Poetry environment found.
Starting FastAPI development server...
Backend will be available at: http://localhost:8000
API documentation at: http://localhost:8000/docs
Press Ctrl+C to stop the server

INFO:     Will watch for changes in these directories: ['C:\\Users\\Cheney\\Documents\\Github\\MedicalDeviceRegulationAgent\\medical-device-regulatory-assistant\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [3648] using WatchFiles
Process SpawnProcess-1:
Traceback (most recent call last):
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\multiprocessing\process.py", line 314, in _bootstrap
    self.run()
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\multiprocessing\process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\_subprocess.py", line 80, in subprocess_started
    target(sockets=sockets)
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\server.py", line 65, in run
    return asyncio.run(self.serve(sockets=sockets))
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\asyncio\runners.py", line 190, in run
    return runner.run(main)
           ^^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\asyncio\runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\asyncio\base_events.py", line 650, in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\server.py", line 69, in serve
    await self._serve(sockets)
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\server.py", line 76, in _serve
    config.load()
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\config.py", line 434, in load
    self.loaded_app = import_from_string(self.app)
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\importer.py", line 22, in import_from_string
    raise exc from None
  File "C:\Users\Cheney\AppData\Local\pypoetry\Cache\virtualenvs\medical-device-regulatory-assistant-backen-AE47WBm0-py3.11\Lib\site-packages\uvicorn\importer.py", line 19, in import_from_string
    module = importlib.import_module(module_str)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Cheney\AppData\Local\Programs\Python\Python311\Lib\importlib\__init__.py", line 126, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<frozen importlib._bootstrap>", line 1206, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1178, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1149, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 690, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 940, in exec_module
  File "<frozen importlib._bootstrap>", line 241, in _call_with_frames_removed
  File "C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant\backend\main.py", line 30, in <module>
    from api.health import router as health_router
  File "C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant\backend\api\health.py", line 5, in <module>
    from services.health_check import health_service
  File "C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant\backend\services\health_check.py", line 8, in <module>
    import asyncpg
ModuleNotFoundError: No module named 'asyncpg'
