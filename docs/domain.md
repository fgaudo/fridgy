---
title: 'Domain layer'
nav_order: 2
---

# Domain layer

## Description

The domain layer is the one responsible of holding **all** business rules.

If you need a place to put logic that answers to questions like "_What fields does a product have?_" or "_When can a banking account be considered closed?_" or even "_Must the name be unique among all other entities?_", then this is the one.

The domain layer solely provides functions and objects to the application layer and can only depend on external libraries or on the core layer.  
In the domain layer it's **forbidden** to handle or return _effects_. Every function inside of it **must** be pure and deterministic.

The domain objects returned by the domain layer must be _opaque values_, meaning they cannot be directly accessed by other layers. In order to get the data, special getters functions must be used on them.

For example if we create a `Person` object with `name` and `age`, and we need to know if the person is old enough to watch some content, then the domain layer should have an `isAllowedToWatch` function which checks the given age and returns either `true` or `false`.  
The application layer should be completely ignorant about these details and should always ask the domain layer for this information.

It's also important to note that the domain layer is not concerned with where the data is stored or whether it is provided with real or mock data.  
More generally, the domain layer does not know the current state of the application.
Its primary responsibility is to ensure that all the information it provides is consistent with the defined business rules.  
It is the application layer's responsibility to provide the domain layer with the current state of the application.

As an example, to enforce the uniqueness of names, the domain layer would require a `isUniqueName` boolean when creating the domain object.  
Wether the application layer just blindly fills that value with `true` or correctly takes the information from the data layer, the domain layer does not care.

## A general example

A more general example of how an application would take some data and show it to the user might be:

1. The application layer retrieves data from a data source, such as a database, API, or other external service.
2. The application layer then uses this data to instantiate domain objects by invoking constructor functions or factory methods located within the domain layer.
3. After the domain objects are created, the application layer converts them into UI models.
4. Finally, the UI layer receives the UI models and renders them, displaying the relevant information to the user in an appropriate format.
