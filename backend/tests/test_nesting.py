import pytest
from app.services.nesting_engine import run_nesting, get_demo_patterns
from app.schemas.schemas import ShapeInput

def test_preset_patterns():
    presets = get_demo_patterns()
    assert len(presets) > 0
    assert presets[0]["id"] == "tshirt_front"
    assert len(presets[0]["points"]) > 2

def test_nesting_calculation():
    # Setup standard shape inputs
    presets = get_demo_patterns()
    shapes = [
        ShapeInput(
            id=presets[0]["id"],
            points=presets[0]["points"],
            quantity=2,
            allow_rotation=True
        ),
        ShapeInput(
            id=presets[2]["id"],
            points=presets[2]["points"],
            quantity=2,
            allow_rotation=True
        )
    ]

    # Test run nesting on 120 width fabric
    result = run_nesting(
        fabric_width=120.0,
        fabric_height=0.0,  # Infinite roll
        shapes_input=shapes,
        algorithm="Skyline",
        margin=2.0
    )

    assert result["status"] == "completed"
    assert result["fabric_width"] == 120.0
    assert result["fabric_height"] > 0
    assert result["utilization_percentage"] > 0
    assert result["utilization_percentage"] <= 100.0
    assert len(result["optimized_layout"]) == 4

    # Ensure coordinates are numbers
    for shape in result["optimized_layout"]:
        assert "x" in shape
        assert "y" in shape
        assert isinstance(shape["points"], list)
        assert len(shape["points"]) > 0
